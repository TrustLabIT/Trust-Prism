// Shimmer placeholder cards shown while the asset grid loads
function SkeletonCard() {
  return (
    <div className="sk-card">
      <div className="sk-thumb shimmer"></div>
      <div className="sk-body">
        <div className="sk-line title shimmer"></div>
        <div className="sk-line meta shimmer"></div>
        <div className="sk-line tags shimmer"></div>
      </div>
    </div>
  );
}

export default function SkeletonGrid({ count = 8 }) {
  return (
    <div className="grid">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}
