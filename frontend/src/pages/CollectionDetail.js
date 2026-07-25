import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import AssetCard from "../components/AssetCard";
import SkeletonGrid from "../components/SkeletonCard";
import { grad } from "../utils/helpers";

const PAGE = 24;

export default function CollectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { assets, assetsStatus, hasMore, assetPage, fetchAssets, collections, assetsKey } = useApp();
  const collection = collections.find((c) => c.id === id);
  const sentinel = useRef(null);
  const loading = assetsStatus === "loading";
  const ready = assetsKey === ["all", "all", "all", "", id].join("|");

  // load this collection's assets
  useEffect(() => {
    fetchAssets({ collection: id, page: 1, limit: PAGE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // infinite scroll
  useEffect(() => {
    if (!sentinel.current || !hasMore || loading) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchAssets({ collection: id, page: assetPage + 1, limit: PAGE, append: true });
      }
    }, { rootMargin: "400px" });
    io.observe(sentinel.current);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, assetPage, id]);

  const cover = collection?.grad || grad(2);

  return (
    <section className="page">
      <div className="crumbs">
        <span style={{ cursor: "pointer" }} onClick={() => navigate("/collections")}>Collections</span> / <b>{collection?.n || "Collection"}</b>
      </div>

      {/* Collection cover banner */}
      <div className="coll-hero" style={{ background: cover }}>
        <div className="coll-hero-info">
          <h1>{collection?.n || "Collection"}</h1>
          <span>{collection ? `${collection.c} asset${collection.c === 1 ? "" : "s"} · ${collection.y}` : ""}</span>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate("/collections")}>← All collections</button>
      </div>

      {!ready ? (
        <SkeletonGrid count={6} />
      ) : assets.length === 0 ? (
        <div className="empty">
          No assets in this collection yet.<br />
          Upload an asset and pick this collection, or open any asset → <b>Edit</b> → set its Collection.
        </div>
      ) : (
        <>
          {loading && <div className="lib-bar" />}
          <div className="grid">
            {assets.map((a) => <AssetCard key={a.id} asset={a} />)}
          </div>
          <div ref={sentinel} style={{ height: 1 }}></div>
        </>
      )}
    </section>
  );
}
