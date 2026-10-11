export type RuleBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'subtitle'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'steps'; items: { title: string; text: string }[] }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'definitions'; items: { term: string; text: string }[] }
  | { kind: 'callout'; title: string; text: string }

export type RuleSection = {
  id: string
  title: string
  blocks: RuleBlock[]
}

export type RulesContent = {
  facts: { label: string; value: string }[]
  sections: RuleSection[]
}
