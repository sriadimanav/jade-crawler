import { useState } from 'react'

export default function VariantTabs({
  variants,
  activeVariant,
  onSelectVariant,
  onAddVariant,
  onEditVariant,
  onManageFlows,
}) {
  const [showMenu, setShowMenu] = useState(null)

  return (
    <div className="variant-tabs">
      <div className="variant-tabs-list">
        {variants.map((variant) => (
          <div
            key={variant.id}
            className={`variant-tab ${activeVariant?.id === variant.id ? 'active' : ''}`}
            onClick={() => onSelectVariant(variant)}
          >
            <span className="variant-tab-icon">{variant.icon || '📱'}</span>
            <span className="variant-tab-name">{variant.name}</span>
            {variant.owner && (
              <span className="variant-tab-owner">@{variant.owner}</span>
            )}
            <button
              className="variant-tab-menu-btn"
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(showMenu === variant.id ? null : variant.id)
              }}
            >
              ⋮
            </button>
            {showMenu === variant.id && (
              <div className="variant-tab-menu">
                <button onClick={() => { onEditVariant(variant); setShowMenu(null) }}>
                  Edit Variant
                </button>
                <button onClick={() => { setShowMenu(null) }}>
                  Duplicate
                </button>
              </div>
            )}
          </div>
        ))}
        <button className="variant-add-btn" onClick={onAddVariant}>
          + Add Variant
        </button>
      </div>
      <button className="variant-flows-btn" onClick={onManageFlows}>
        <span className="flows-icon">🔗</span>
        Cross-Variant Flows
      </button>
    </div>
  )
}
