export const CSS = `
@keyframes oo-route {
  0% { left: 0; opacity: 1; }
  80% { left: calc(100% - 6px); opacity: 1; }
  100% { left: calc(100% - 6px); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .oo-sim-dot { animation: none !important; }
}
`;
