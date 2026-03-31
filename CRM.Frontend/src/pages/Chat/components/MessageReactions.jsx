export default function MessageReactions({ reactions }) {
  if (!reactions || reactions.length === 0) return null;
  const grouped = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});
  return (
    <div className="wa-reactions">
      {Object.entries(grouped).map(([emoji, count]) => (
        <span key={emoji} className="wa-reaction-chip">
          {emoji}{count > 1 && <span className="wa-reaction-count">{count}</span>}
        </span>
      ))}
    </div>
  );
}
