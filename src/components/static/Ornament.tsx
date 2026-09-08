export default function Ornament() {
  return (
    <div className="flex items-center justify-center gap-3 my-2" aria-hidden="true">
      <span className="h-px w-12 bg-gradient-to-r from-transparent to-gold/60" />
      <svg width="20" height="20" viewBox="0 0 24 24" className="text-gold shrink-0">
        <path
          fill="currentColor"
          d="M12 2c1.2 2.4 3.2 4 5.6 4.6-1.8 1-3 2.9-3 5 0 1 .3 2 .8 2.8-1.3-.4-2.5-.4-3.4-.1-.9-.3-2.1-.3-3.4.1.5-.8.8-1.8.8-2.8 0-2.1-1.2-4-3-5C8.8 6 10.8 4.4 12 2z"
        />
      </svg>
      <span className="h-px w-12 bg-gradient-to-l from-transparent to-gold/60" />
    </div>
  );
}
