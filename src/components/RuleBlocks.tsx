import type { RuleBlock } from '../content/rules.types'

export function RuleBlocks({ blocks }: { blocks: RuleBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'paragraph':
            return <p key={index}>{block.text}</p>
          case 'subtitle':
            return <h3 key={index}>{block.text}</h3>
          case 'list':
            return (
              <ul className="rule-list" key={index}>
                {block.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )
          case 'steps':
            return (
              <ol className="rule-steps" key={index}>
                {block.items.map((item) => (
                  <li key={item.title}>
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ol>
            )
          case 'table':
            return (
              <div className="rule-table-wrap" key={index}>
                <table className="rule-table">
                  <thead>
                    <tr>{block.head.map((cell) => <th key={cell} scope="col">{cell}</th>)}</tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row) => (
                      <tr key={row[0]}>
                        {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case 'definitions':
            return (
              <dl className="rule-definitions" key={index}>
                {block.items.map((item) => (
                  <div key={item.term}>
                    <dt>{item.term}</dt>
                    <dd>{item.text}</dd>
                  </div>
                ))}
              </dl>
            )
          case 'callout':
            return (
              <aside className="rule-callout" key={index}>
                <strong>{block.title}</strong>
                <p>{block.text}</p>
              </aside>
            )
        }
      })}
    </>
  )
}
