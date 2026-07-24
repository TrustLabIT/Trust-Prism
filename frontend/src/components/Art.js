import { artSVG } from "../utils/helpers";

// Renders the generated placeholder SVG art for an asset index.
export default function Art({ index, label = "", style }) {
  return (
    <div
      style={{ position: "absolute", inset: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: artSVG(index, label) }}
    />
  );
}
