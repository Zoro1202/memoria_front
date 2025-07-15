import React, { useEffect, useState } from "react";
import Modal from "./Modal";
import "./RecordingList.css";

const API_HOST = "http://localhost:5001";
const CARDS_PER_ROW = 5;
const ROWS_PER_PAGE = 2;
const PAGE_SIZE = CARDS_PER_ROW * ROWS_PER_PAGE; // 10개

export default function RecordingList({ roomId }) {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!roomId) {
      setRecordings([]);
      return;
    }
    setLoading(true);
    fetch(`${API_HOST}/api/recordings?roomId=${encodeURIComponent(roomId)}`)
      .then(res => res.json())
      .then(data => setRecordings(data || []))
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    setPage(1);
  }, [roomId]);

  const totalPages = Math.ceil(recordings.length / PAGE_SIZE);
  const pagedRecordings = recordings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openModal = (rec) => {
    setSelectedVideo(rec);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedVideo(null);
  };

  if (!roomId)
    return <div className="recording-list-empty">방 ID를 입력하세요.</div>;
  if (loading)
    return <div className="recording-list-loading">불러오는 중...</div>;
  if (!recordings.length)
    return <div className="recording-list-empty">녹화된 파일이 없습니다.</div>;

  return (
    <>
      <div className="recording-list-grid">
        {pagedRecordings.map(rec => (
          <div className="recording-card" key={rec.name}>
            <div className="recording-thumb">
              <video
                src={`${API_HOST}${rec.url}`}
                controls={false}
                muted
                width={300}
                height={220}
                style={{ background: "#f2f2f2", borderRadius: 8 }}
                onError={e => {
                  e.target.style.display = "none";
                  if (!e.target.parentNode.querySelector(".default-thumb")) {
                    const fallback = document.createElement("div");
                    fallback.className = "default-thumb";
                    fallback.textContent = "🎬";
                    fallback.style.fontSize = "2.5rem";
                    fallback.style.color = "#bbb";
                    fallback.style.display = "flex";
                    fallback.style.alignItems = "center";
                    fallback.style.justifyContent = "center";
                    fallback.style.height = "220px";
                    fallback.style.width = "300px";
                    e.target.parentNode.appendChild(fallback);
                  }
                }}
              />
            </div>
            <div className="recording-info">
              <div className="recording-title">{rec.name}</div>
              <div className="recording-date">
                {new Date(rec.timestamp).toLocaleString("ko-KR")}
              </div>
            </div>
            <div className="recording-actions">
              <button
                className="play-btn"
                onClick={() => openModal(rec)}
                style={{ cursor: "pointer" }}
              >
                재생
              </button>
              <a
                href={`${API_HOST}/download/${encodeURIComponent(roomId)}/${encodeURIComponent(rec.name)}`}
                className="download-btn"
              >
                다운로드
              </a>
            </div>
          </div>
        ))}
      </div>
      <div className="pagination">
        {Array.from({ length: totalPages }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => setPage(idx + 1)}
            className={page === idx + 1 ? "active" : ""}
          >
            {idx + 1}
          </button>
        ))}
      </div>
      <Modal open={modalOpen} onClose={closeModal}>
        {selectedVideo && (
          <>
            <video
              src={`${API_HOST}${selectedVideo.url}`}
              controls
              autoPlay
              style={{
                width: "100%",
                maxWidth: "800px",
                maxHeight: "60vh",
                borderRadius: 8,
                marginBottom: 16
              }}
            />
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={closeModal} style={{
                padding: "8px 20px",
                borderRadius: 6,
                border: "none",
                background: "#1976d2",
                color: "#fff",
                fontWeight: 500,
                fontSize: "1rem",
                cursor: "pointer"
              }}>닫기</button>
              <a
                href={`${API_HOST}/download/${encodeURIComponent(roomId)}/${encodeURIComponent(selectedVideo.name)}`}
                style={{
                  padding: "8px 20px",
                  borderRadius: 6,
                  background: "#e3f2fd",
                  color: "#1976d2",
                  fontWeight: 500,
                  fontSize: "1rem",
                  textDecoration: "none"
                }}
                download
              >
                다운로드
              </a>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
