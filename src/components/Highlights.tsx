/* Empty circles. Instagram's highlights are not something this app manages —
   they are here because their absence changes where the grid starts, and the
   grid's position on screen is part of what is being previewed. */
export function Highlights({ count = 4 }: { count?: number }) {
  return (
    <div className="highlights" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => <div className="highlight" key={i} />)}
    </div>
  )
}
