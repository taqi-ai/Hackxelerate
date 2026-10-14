/** Each page rises in with a CSS animation (see .page-enter). Pure CSS on purpose: a JS-driven
 *  `opacity: 0` start state leaves the server-rendered page invisible until hydration finishes,
 *  which looks like a blank screen on a slow connection. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
