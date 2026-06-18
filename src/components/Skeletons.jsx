// Placeholders animados (shimmer) para el estado de carga inicial.

function Bar({ w = '100%', h = 14, mt = 0 }) {
  return <div className="skeleton" style={{ width: w, height: h, marginTop: mt }} />;
}

export default function AppSkeleton() {
  return (
    <div className="shell">
      <aside className="side">
        <Bar w="60%" h={38} />
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Bar key={i} h={36} />
          ))}
        </div>
      </aside>
      <main className="main">
        <Bar w="220px" h={28} />
        <div className="kpis" style={{ marginTop: 24 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="kpi">
              <Bar w="60%" h={11} />
              <Bar w="40%" h={36} mt={14} />
            </div>
          ))}
        </div>
        <div className="grid">
          <div className="col">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="card">
                <div className="card-b">
                  <Bar w="50%" h={16} />
                  <Bar h={12} mt={14} />
                  <Bar w="80%" h={12} mt={8} />
                </div>
              </div>
            ))}
          </div>
          <div className="col">
            <div className="card">
              <div className="card-b">
                <Bar w="50%" h={16} />
                <Bar h={140} mt={14} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
