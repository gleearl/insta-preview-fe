import type { Account } from '../types'

type Props = {
  accounts: Account[]
  active: Account | null
  onSelect: (id: number) => void
  onAdd: () => void
  onEdit: (account: Account) => void
  onRemove: (account: Account) => void
}

export function AccountSwitcher({ accounts, active, onSelect, onAdd, onEdit, onRemove }: Props) {
  return (
    <div className="switcher">
      {accounts.map(account => (
        <div className="switcher-row" key={account.id}>
          <button className="switcher-pick" onClick={() => onSelect(account.id)}>
            {account.avatar_url
              ? <img className="switcher-avatar" src={account.avatar_url} alt="" />
              : <div className="switcher-avatar" />}
            <span className="switcher-name">{account.username}</span>
            {account.kind === 'online' && <span className="switcher-tag">synced</span>}
            {active?.id === account.id && <span aria-label="Selected">✓</span>}
          </button>
          <button className="icon-button" onClick={() => onEdit(account)}
            aria-label={`Edit ${account.username}`}>✎</button>
          <button className="icon-button" onClick={() => onRemove(account)}
            aria-label={`Remove ${account.username}`}>🗑</button>
        </div>
      ))}

      <button className="pill" onClick={onAdd}>Add account</button>
    </div>
  )
}
