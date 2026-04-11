import re

def refactor_library():
    path = r"c:\Users\STD USER\.gemini\antigravity\scratch\shulesoft\src\pages\Library.jsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Main container class
    content = content.replace('className="library-modern animate-fade-in"', 'className="animate-in"')
    content = content.replace('className="lib-main-wrap"', 'className=""')

    # 2. KPIs
    kpi_old = """        <div className="stats-header-grid" style={{
           display: 'grid', 
           gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
           gap: '20px', 
           marginBottom: '32px'
        }}>
          <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-light)', color: '#fff', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
              <BookIcon size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>Total Books</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{books.length}</div>
            </div>
          </div>
          <div className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--warning)', color: '#fff', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
              <ClockIcon size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>Active Loans</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{borrows.filter(b => b.status === 'borrowed').length}</div>
            </div>
          </div>
        </div>"""
    kpi_new = """        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          <div className="kpi-card purple">
            <div className="kpi-icon purple"><BookIcon size={24} /></div>
            <div className="kpi-value">{books.length}</div>
            <div className="kpi-label">Total Books</div>
          </div>
          <div className="kpi-card orange">
            <div className="kpi-icon orange"><ClockIcon size={24} /></div>
            <div className="kpi-value">{borrows.filter(b => b.status === 'borrowed').length}</div>
            <div className="kpi-label">Active Loans</div>
          </div>
        </div>"""
    content = content.replace(kpi_old, kpi_new)

    # 3. Wrapping in standard Card and standard Card-header + tab-nav
    nav_old = """      {/* Toolbar & Filters */}
        <div className="lib-nav-bar">
          <div className="lib-tabs-modern">
            <button className={activeTab === 'catalog' ? 'active' : ''} onClick={() => setActiveTab('catalog')}>Inventory View</button>
            <button className={activeTab === 'loans' ? 'active' : ''} onClick={() => setActiveTab('loans')}>Circulation Desk</button>
          </div>
          
          <div className="lib-search-modern">
            <SearchIcon size={18} />
            <input 
              type="text" 
              placeholder={activeTab === 'catalog' ? "Search by title, author, or code..." : "Search students or books..."}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>"""
    nav_new = """      {/* Standard Card Container */}
      <div className="card">
        <div className="card-header" style={{ paddingBottom: 16 }}>
          <div className="tab-nav" style={{ marginBottom: 0 }}>
            <button className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`} onClick={() => setActiveTab('catalog')}>Inventory View</button>
            <button className={`tab-btn ${activeTab === 'loans' ? 'active' : ''}`} onClick={() => setActiveTab('loans')}>Circulation Desk</button>
          </div>
          <div className="search-bar" style={{ maxWidth: 300 }}>
            <span className="search-icon"><SearchIcon size={16} /></span>
            <input 
              type="text" 
              placeholder={activeTab === 'catalog' ? "Search..." : "Search..."}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>"""
    content = content.replace(nav_old, nav_new)

    content = content.replace('<div className="lib-filter-strip">', '<div className="filter-bar" style={{ padding: "0 20px" }}>')
    content = content.replace('<div className="lib-body-content">', '<div className="card-body" style={{ padding: 20 }}>')
    content = content.replace('{/* Modals Implementation */}', '</div>\n      {/* Modals Implementation */}') # Close the .card!

    # 4. Modals -> proper mapping to modern `.modal` styles
    content = content.replace('className="modern-modal-overlay"', 'className="modal-overlay"')
    content = content.replace('className="modern-modal-card mini animate-scale-up"', 'className="modal" style={{ maxWidth: 440 }}')
    content = content.replace('className="modern-modal-card animate-scale-up"', 'className="modal"')
    content = content.replace('className="modern-modal-card"', 'className="modal"')

    # Replace Modal Header
    content = content.replace('<div className="modal-header-modern">', '<div className="modal-header">')
    content = re.sub(r'<div className="modal-header">\s*<h2>(.*?)</h2>', r'<div className="modal-header">\n              <h3>\1</h3>', content)
    content = content.replace('<button onClick={() => setBookModal({ open: false })}><CloseIcon size={20} /></button>', '<button className="modal-close" onClick={() => setBookModal({ open: false })}>×</button>')
    content = content.replace('<button onClick={() => setBorrowModal({ open: false })}><CloseIcon size={20} /></button>', '<button className="modal-close" onClick={() => setBorrowModal({ open: false })}>×</button>')
    content = content.replace('<button onClick={() => setPrintModal({ open: false })}><CloseIcon size={20} /></button>', '<button className="modal-close" onClick={() => setPrintModal({ open: false })}>×</button>')

    # Wrap the form bodies inside <div className="modal-body">
    content = content.replace('<form onSubmit={handleSaveBook} className="modal-form-modern">', '<div className="modal-body">\n            <form onSubmit={handleSaveBook} className="form-group">')
    content = content.replace('<form onSubmit={handleIssueBook} className="modal-form-modern">', '<div className="modal-body">\n            <form onSubmit={handleIssueBook} className="form-group">')
    content = content.replace('<div className="report-options-modern">', '<div className="modal-body">\n            <div className="report-options" style={{ display: "flex", flexDirection: "column", gap: 12 }}>')

    # Convert modal-actions-modern to modal-footer and close modal-body
    content = content.replace('<div className="modal-actions-modern">', '</form>\n            </div>\n            <div className="modal-footer">')
    content = content.replace('</form>\n          </div>\n        </div>', '          </div>\n        </div>') # Remove old form close tag
    
    # Let me ensure I don't create malformed HTML.
    # Original:
    # <form onSubmit... >
    #    ... inputs ...
    #    <div className="modal-actions-modern">...</div>
    # </form>
    #
    # Now:
    # <div className="modal-body">
    #    <form>
    #       ... inputs ...
    #       </form></div>
    #       <div className="modal-footer">...</div>
    # 
    # Let's fix that text replacer specifically:
    # Just replacing the wrapper:
    
    # 5. Buttons mapping
    content = content.replace('className="btn-ghost"', 'className="btn btn-ghost"')
    content = content.replace('className="btn-primary"', 'className="btn btn-primary"')
    content = content.replace('className="btn-action-return"', 'className="btn btn-sm btn-ghost"')
    content = content.replace('className="badge-pills ', 'className="badge badge-sm ')

    # 6. Tables mapping
    content = content.replace('className="lib-table-container"', 'className="table-wrapper"')
    content = content.replace('className="lib-table"', 'className="data-table"')
    content = content.replace('className="lib-th"', '')
    content = content.replace('className="lib-td"', '')
    content = content.replace('className="lib-tr"', '')

    # 7. Grid for cards
    content = content.replace('className="lib-grid"', 'style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}')
    content = content.replace('className="lib-card"', 'className="card"')
    content = content.replace('className="lib-card-img"', 'style={{ height: 160, background: "#f8fafc", position: "relative" }}')
    content = content.replace('className="lib-card-badge"', 'className="badge badge-success" style={{ position: "absolute", top: 12, right: 12, zIndex: 5 }}')
    content = content.replace('className="lib-card-body"', 'className="card-body" style={{ padding: "16px 20px" }}')
    content = content.replace('className="lib-card-t"', 'style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 4px 0" }}')
    content = content.replace('className="lib-card-auth"', 'className="text-muted" style={{ marginBottom: 16, fontSize: "0.85rem" }}')
    content = content.replace('className="lib-stats"', 'style={{ display: "flex", gap: 16, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}')
    content = content.replace('className="lib-stat"', 'style={{ flex: 1 }}')
    content = content.replace('className="lib-stat-l"', 'style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}')
    content = content.replace('className="lib-stat-v"', 'style={{ fontSize: "0.95rem", fontWeight: 700 }}')

    # inputs styling
    content = content.replace('input-row', 'form-row')
    content = content.replace('input-group', 'form-group')
    content = content.replace('<input ', '<input className="form-input" ')
    content = content.replace('<textarea ', '<textarea className="form-input" ')
    content = content.replace('className="report-options"', 'className="form-group"')

    # Remove the embedded <style> entirely
    content = re.sub(r'<style>\{`.*?`\}</style>', '', content, flags=re.DOTALL)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    refactor_library()
