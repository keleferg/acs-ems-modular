const fs = require('fs');
process.chdir(require('node:path').resolve(__dirname, '..'));
const ts = require(process.cwd() + '/node_modules/typescript');
const Module = require('module');
const React = require(process.cwd() + '/node_modules/react');
const { renderToStaticMarkup } = require(process.cwd() + '/node_modules/react-dom/server');
const assert = require('node:assert/strict');
const filename = process.cwd() + '/components/poa/timeline-event-editor.tsx';
const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
const componentModule = new Module(filename, module);
componentModule.filename = filename;
componentModule.paths = Module._nodeModulePaths(process.cwd());
componentModule._compile(js, filename);
const { TimelineEventEditor } = componentModule.exports;
const html = renderToStaticMarkup(React.createElement(TimelineEventEditor, {
 scenario: { title: 'Scenario mission', narrative: 'Scenario narrative' },
 eventSets: [{ id: 'a', name: 'Preflight Preparation', maxQuestionCount: 6 }, { id: 'b', name: 'Engine Start', maxQuestionCount: 5 }],
 questions: [{ id: 'q', title: 'Question assigned to start', eventSetIds: ['b'], assignedEventSetId: 'b', selected: true }],
 triggers: [{ id: 't', title: 'Trigger assigned to preparation', eventSetIds: ['a'], assignedEventSetId: 'a', selected: true }],
 onAssign() {}, onRemove() {},
}));
assert(html.indexOf('Scenario mission') < html.indexOf('event-body-a'));
assert.match(html, /rounded-full[^>]*>1<\/span>/);
assert.match(html, /rounded-full[^>]*>2<\/span>/);
assert.doesNotMatch(html, /rounded-full[^>]*>3<\/span>/);
assert.match(html, /aria-expanded="true" aria-controls="event-body-a"/);
const a = html.slice(html.indexOf('id="event-body-a"'), html.indexOf('aria-controls="event-body-b"'));
const b = html.slice(html.indexOf('id="event-body-b"'), html.indexOf('<aside'));
assert(a.includes('Trigger assigned to preparation'));
assert(!a.includes('Question assigned to start'));
assert(b.includes('Question assigned to start'));
assert(!b.includes('Trigger assigned to preparation'));
assert(html.includes('draggable="true"'));
assert(html.includes('Add to event set'));
console.log('Timeline render checks passed: unnumbered scenario, sequential event sets, accessible collapse controls, correct question/trigger placement, and draggable library entries.');

// Exercise the actual drop handler, without needing a browser or database.
const actions = [];
const interactiveModule = new Module(filename, module);
interactiveModule.filename = filename;
interactiveModule.paths = Module._nodeModulePaths(process.cwd());
const realRequire = interactiveModule.require.bind(interactiveModule);
interactiveModule.require = (name) => name === 'react'
  ? { ...React, useState: (initial) => [initial, () => {}] }
  : realRequire(name);
interactiveModule._compile(js, filename);
const tree = interactiveModule.exports.TimelineEventEditor({
 scenario: { title: 'Mission' },
 eventSets: [{ id: 'a', name: 'Preparation', maxQuestionCount: 6 }, { id: 'b', name: 'Start', maxQuestionCount: 5 }],
 questions: [{ id: 'q', title: 'Question', eventSetIds: ['b'] }],
 triggers: [{ id: 't', title: 'Trigger', eventSetIds: ['a'] }],
 onAssign: (...args) => actions.push(args), onRemove() {},
});
function flatten(node) {
 if (!node || typeof node !== 'object') return [];
 const children = React.Children.toArray(node.props?.children);
 return [node, ...children.flatMap(flatten)];
}
const zones = flatten(tree).filter((element) => element.type === 'section' && element.props.onDrop);
assert.equal(zones.length, 2);
function drop(zone, payload) { zone.props.onDrop({ preventDefault() {}, dataTransfer: { getData: () => payload } }); }
drop(zones[1], JSON.stringify({ kind: 'question', id: 'q' }));
drop(zones[0], JSON.stringify({ kind: 'trigger', id: 't' }));
assert.deepEqual(actions, [['question', 'q', 'b'], ['trigger', 't', 'a']]);
drop(zones[0], JSON.stringify({ kind: 'question', id: 'q' }));
drop(zones[1], JSON.stringify({ kind: 'trigger', id: 't' }));
drop(zones[0], 'invalid data');
assert.equal(actions.length, 2, 'Incompatible and malformed drops must not assign items');
console.log('Drop handler checks passed: valid question/trigger assignments accepted; incompatible and malformed drops rejected.');

const { insertTimelineItem } = componentModule.exports;
assert.deepEqual(insertTimelineItem(['question:a', 'trigger:t', 'question:b'], 'trigger:t', 'question:a'), ['trigger:t', 'question:a', 'question:b']);
assert.deepEqual(insertTimelineItem(['question:a', 'trigger:t', 'question:b'], 'question:a'), ['trigger:t', 'question:b', 'question:a']);
assert.deepEqual(insertTimelineItem(['question:a', 'trigger:t'], 'question:b', 'trigger:t'), ['question:a', 'question:b', 'trigger:t']);
assert.deepEqual(insertTimelineItem(['question:a', 'trigger:t'], 'trigger:t', 'trigger:t'), ['question:a', 'trigger:t']);
const mixedProps = {
 scenario: { title: 'Mixed mission' },
 eventSets: [{ id: 'mixed', name: 'Mixed event', maxQuestionCount: 6 }],
 questions: [{ id: 'a', title: 'First question', eventSetIds: ['mixed'], assignedEventSetId: 'mixed', selected: true }, { id: 'b', title: 'Second question', eventSetIds: ['mixed'], assignedEventSetId: 'mixed', selected: true }],
 triggers: [{ id: 't', title: 'Middle trigger', eventSetIds: ['mixed'], assignedEventSetId: 'mixed', selected: true }],
 itemOrder: { mixed: ['question:a', 'trigger:t', 'question:b'] },
 onAssign() { return true; }, onRemove() {},
};
const mixedHtml = renderToStaticMarkup(React.createElement(TimelineEventEditor, mixedProps));
const mixedBody = mixedHtml.slice(mixedHtml.indexOf('<ol'), mixedHtml.indexOf('</ol>'));
assert(mixedBody.indexOf('First question') < mixedBody.indexOf('Middle trigger'));
assert(mixedBody.indexOf('Middle trigger') < mixedBody.indexOf('Second question'));
const changes = [];
const mixedTree = interactiveModule.exports.TimelineEventEditor({ ...mixedProps, onOrderChange: (id, keys) => changes.push([id, keys]) });
const rows = flatten(mixedTree).filter((entry) => entry.type === 'li');
rows[0].props.onDrop({ preventDefault() {}, stopPropagation() {}, dataTransfer: { getData: () => JSON.stringify({ kind: 'trigger', id: 't' }) } });
assert.deepEqual(changes[0], ['mixed', ['trigger:t', 'question:a', 'question:b']]);
const moveDown = flatten(rows[0]).find((entry) => entry.props?.['aria-label'] === 'Move First question down');
moveDown.props.onClick();
assert.deepEqual(changes[1], ['mixed', ['trigger:t', 'question:a', 'question:b']]);
console.log('Mixed ordering checks passed: question/trigger/question rendering, arbitrary insertions, existing-item moves, and keyboard reorder controls.');
