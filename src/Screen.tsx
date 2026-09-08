import { useState } from 'react'
import { AccountForm } from './accounts/AccountForm'
import { AccountSwitcher } from './accounts/AccountSwitcher'
import { useAccounts } from './accounts/useAccounts'
import { useAuth } from './auth/AuthProvider'
import { Highlights } from './components/Highlights'
import { ProfileHeader } from './components/ProfileHeader'
import { Sheet } from './components/Sheet'
import { TabBar } from './components/TabBar'
import type { Tab } from './components/TabBar'
import { AddPhotos } from './grid/AddPhotos'
import { Grid } from './grid/Grid'
import type { Ratio } from './grid/Grid'
import { useGrid } from './grid/useGrid'
import { Viewer } from './grid/Viewer'
import type { Account, GridItem } from './types'

export function Screen() {
  const { signOut } = useAuth()
  const accountsState = useAccounts()
  const { accounts, active, activeId, setActiveId, sync, syncing } = accountsState
  const grid = useGrid(activeId)

  const [preview, setPreview] = useState(false)
  const [ratio, setRatio] = useState<Ratio>('4:5')
  const [tab, setTab] = useState<Tab>('grid')
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null | undefined>(undefined)
  const [viewing, setViewing] = useState<GridItem | null>(null)

  const error = accountsState.error || grid.error

  function step(direction: -1 | 1) {
    if (!viewing) return
    const index = grid.items.findIndex(i => i.id === viewing.id)
    const next = grid.items[index + direction]
    if (next) setViewing(next)
  }

  if (accountsState.loading) {
    return <div className="screen"><p className="empty">…</p></div>
  }

  if (accounts.length === 0) {
    return (
      <div className="screen">
        <div className="empty">
          <h2>No accounts yet</h2>
          <p>Add an account to start planning a grid.</p>
          <button className="primary" onClick={() => setEditing(null)}>Add an account</button>
        </div>
        <Sheet open={editing !== undefined} title="New account" onClose={() => setEditing(undefined)}>
          <AccountForm
            account={null}
            onSubmit={async draft => { await accountsState.create(draft); setEditing(undefined) }}
            onCancel={() => setEditing(undefined)}
          />
        </Sheet>
      </div>
    )
  }

  if (!active) return <div className="screen"><p className="empty">…</p></div>

  return (
    <div className="screen">
      {/* In preview mode this is the only control left, and it sits over the
          page rather than in it — anything in the layout would shift the
          thing being previewed. */}
      <button className="preview-toggle" onClick={() => setPreview(p => !p)}>
        {preview ? '✕ Editing' : '👁 Preview'}
      </button>

      <ProfileHeader
        account={active}
        onSwitch={() => setSwitcherOpen(true)}
        actions={
          preview ? null : (
            <AddPhotos
              onFiles={files => void grid.upload(files)}
              onError={grid.setError}
              busy={grid.uploading}
            />
          )
        }
      />

      {!preview && (
        <div className="toolbar">
          {active.kind === 'online' && (
            <button className="pill" disabled={syncing}
              onClick={() => { sync(active.id).then(() => grid.reload()).catch(() => {}) }}>
              {syncing ? 'Syncing…' : 'Sync'}
            </button>
          )}
          <div className="ratio-toggle">
            <button className="segment" aria-pressed={ratio === '4:5'} onClick={() => setRatio('4:5')}>4:5</button>
            <button className="segment" aria-pressed={ratio === '1:1'} onClick={() => setRatio('1:1')}>1:1</button>
          </div>
        </div>
      )}

      {error && !preview && <p className="banner" role="alert">{error}</p>}

      <Highlights />
      <TabBar active={tab} onChange={setTab} />

      {tab === 'grid' ? (
        <Grid
          items={grid.items}
          ratio={ratio}
          editing={!preview}
          onOpen={item => { if (!preview) setViewing(item) }}
          onReorder={grid.reorder}
        />
      ) : (
        <p className="empty">Nothing here — this app only previews the grid.</p>
      )}

      <Sheet open={switcherOpen} title="Accounts" onClose={() => setSwitcherOpen(false)}>
        <AccountSwitcher
          accounts={accounts}
          active={active}
          onSelect={id => { setActiveId(id); setSwitcherOpen(false) }}
          onAdd={() => { setSwitcherOpen(false); setEditing(null) }}
          onEdit={account => { setSwitcherOpen(false); setEditing(account) }}
          onRemove={account => {
            if (!window.confirm(`Remove ${account.username}? Its drafts go too, and that cannot be undone.`)) return
            void accountsState.remove(account.id)
          }}
        />
        <button className="link" onClick={() => void signOut()}>Sign out</button>
      </Sheet>

      <Sheet
        open={editing !== undefined}
        title={editing ? 'Edit account' : 'New account'}
        onClose={() => setEditing(undefined)}
      >
        <AccountForm
          account={editing ?? null}
          onSubmit={async draft => {
            if (editing) await accountsState.update(editing.id, draft)
            else await accountsState.create(draft)
            setEditing(undefined)
          }}
          onCancel={() => setEditing(undefined)}
        />
      </Sheet>

      {viewing && (
        <Viewer
          item={grid.items.find(i => i.id === viewing.id) ?? viewing}
          onClose={() => setViewing(null)}
          onPatch={grid.patch}
          onDelete={id => { void grid.remove(id); setViewing(null) }}
          onStep={step}
        />
      )}
    </div>
  )
}
