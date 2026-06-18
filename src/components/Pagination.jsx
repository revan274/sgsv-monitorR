export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pager">
      <button className="btn" disabled={page === 1} onClick={() => onChange(page - 1)}>
        Anterior
      </button>
      <span className="info">
        {page} / {totalPages}
      </span>
      <button className="btn" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
        Siguiente
      </button>
    </div>
  );
}
