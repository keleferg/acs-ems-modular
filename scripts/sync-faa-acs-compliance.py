#!/usr/bin/env python3

from html.parser import HTMLParser
from urllib.parse import urljoin
from urllib.request import Request, urlopen
from pathlib import Path
import json
import re
import sys
import tempfile

FAA_ACS_PAGE = "https://www.faa.gov/training_testing/testing/acs"

USER_AGENT = (
    "Mozilla/5.0 DPE-EMS FAA-ACS-Sync/1.0"
)

CODE_RE = re.compile(
    r"\b([A-Z]{1,5})"
    r"\.([IVXLCDM]+)"
    r"\.([A-Z])"
    r"\.([KRS])"
    r"\s*([0-9]+)",
    re.I,
)

FAA_DOC_RE = re.compile(
    r"\(FAA-S-ACS-[^)]+\)",
    re.I,
)

TASK_RE = re.compile(
    r"^Task\s+([A-Z])\.\s+(.+?)\s*$",
    re.I | re.M,
)



def fetch(url: str) -> bytes:
    request = Request(
        url,
        headers={"User-Agent": USER_AGENT},
    )

    with urlopen(request, timeout=60) as response:
        return response.read()


class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.current_href = None
        self.current_text = []
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "a":
            return

        attrs = dict(attrs)
        self.current_href = attrs.get("href")
        self.current_text = []

    def handle_data(self, data):
        if self.current_href is not None:
            self.current_text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() != "a":
            return

        if self.current_href:
            text = " ".join(
                "".join(self.current_text).split()
            )

            self.links.append(
                (text, self.current_href)
            )

        self.current_href = None
        self.current_text = []


def main():
    try:
        from pypdf import PdfReader
    except ImportError:
        print(
            "ERROR: pypdf is required.",
            file=sys.stderr,
        )
        sys.exit(2)

    html = fetch(FAA_ACS_PAGE).decode(
        "utf-8",
        errors="replace",
    )

    parser = LinkParser()
    parser.feed(html)

    documents = []

    for title, href in parser.links:
        if not FAA_DOC_RE.search(title):
            continue

        url = urljoin(FAA_ACS_PAGE, href)

        # Avoid duplicates.
        if any(
            item["url"] == url
            for item in documents
        ):
            continue

        documents.append(
            {
                "title": title,
                "url": url,
            }
        )

    if not documents:
        raise RuntimeError(
            "No FAA ACS documents were discovered."
        )

    print(
        f"FAA ACS publications discovered: "
        f"{len(documents)}"
    )

    output_documents = []
    all_entries = []

    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)

        for index, document in enumerate(
            documents,
            start=1,
        ):
            title = document["title"]
            url = document["url"]

            print(
                f"[{index}/{len(documents)}] "
                f"{title}"
            )

            pdf_bytes = fetch(url)

            pdf_path = (
                tmpdir /
                f"acs-{index:02d}.pdf"
            )

            pdf_path.write_bytes(pdf_bytes)

            reader = PdfReader(str(pdf_path))

            text_parts = []

            for page in reader.pages:
                page_text = page.extract_text() or ""
                text_parts.append(page_text)

            text = "\n".join(text_parts)

            parents = set()
            prefixes = set()
            task_names = {}

            task_matches = list(TASK_RE.finditer(text))

            for task_index, task_match in enumerate(task_matches):
                task_letter = task_match.group(1).upper()
                task_name = " ".join(
                    task_match.group(2).split()
                )

                block_start = task_match.end()

                if task_index + 1 < len(task_matches):
                    block_end = task_matches[task_index + 1].start()
                else:
                    block_end = len(text)

                task_block = text[block_start:block_end]

                for match in CODE_RE.finditer(task_block):
                    prefix = match.group(1).upper()
                    area = match.group(2).upper()
                    task = match.group(3).upper()
                    element = match.group(4).upper()

                    if task != task_letter:
                        continue

                    parent = (
                        f"{prefix}."
                        f"{area}."
                        f"{task}."
                        f"{element}"
                    )

                    task_names.setdefault(
                        parent,
                        task_name,
                    )

            for match in CODE_RE.finditer(text):
                prefix = match.group(1).upper()
                area = match.group(2).upper()
                task = match.group(3).upper()
                element = match.group(4).upper()

                parent = (
                    f"{prefix}."
                    f"{area}."
                    f"{task}."
                    f"{element}"
                )

                parents.add(parent)
                prefixes.add(prefix)
            if not parents:
                print(
                    "  WARNING: no ACS codes extracted."
                )

            sorted_parents = sorted(
                parents,
                key=lambda value: (
                    value.split(".")[0],
                    value.split(".")[1],
                    value.split(".")[2],
                    {"K": 0, "R": 1, "S": 2}.get(
                        value.split(".")[3],
                        9,
                    ),
                ),
            )

            source = {
                "title": title,
                "url": url,
                "prefixes": sorted(prefixes),
                "codes": sorted_parents,
                "code_count": len(sorted_parents),
            }

            output_documents.append(source)

            for code in sorted_parents:
                all_entries.append(
                    {
                        "code": code,
                        "task_name": task_names.get(code),
                        "source_title": title,
                        "source_url": url,
                    }
                )

    # Deduplicate globally by code + document.
    unique_entries = []
    seen = set()

    for entry in all_entries:
        key = (
            entry["code"],
            entry["source_title"],
        )

        if key in seen:
            continue

        seen.add(key)
        unique_entries.append(entry)

    output = {
        "source": FAA_ACS_PAGE,
        "documents": output_documents,
        "entries": unique_entries,
        "document_count": len(output_documents),
        "entry_count": len(unique_entries),
    }

    output_path = Path(
        "data/faa-acs-compliance-catalog.json"
    )

    output_path.write_text(
        json.dumps(
            output,
            indent=2,
            ensure_ascii=False,
        )
        + "\n"
    )

    print()
    print(
        f"Catalog written: {output_path}"
    )
    print(
        f"FAA ACS publications: "
        f"{len(output_documents)}"
    )
    print(
        f"Normalized compliance elements: "
        f"{len(unique_entries)}"
    )

    print()
    print("Prefixes discovered:")

    all_prefixes = sorted(
        {
            prefix
            for document in output_documents
            for prefix in document["prefixes"]
        }
    )

    print("  " + ", ".join(all_prefixes))


if __name__ == "__main__":
    main()
