// The examiner controls placement; approved mappings provide defaults, not drop restrictions.
export function questionEventTargets(questionId: string, rules: readonly { question_id: string; event_set_id: string; review_status: string }[], eventSetIds: readonly string[]) {
  void questionId;
  void rules;
  return [...eventSetIds];
}
