import React, { useState, useEffect, useRef, useCallback } from "react";
import { useGroups } from "../../Contexts/GroupContext";
import io from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";
import * as fabric from "fabric";
import MeetingRoomUI from "./MeetingRoomUI";
import JoinRoomUI from "./JoinRoomUI";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

const SERVER_URL = "https://hwasang.memoriatest.kro.kr";

function generateUniqueId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Fabric 객체 id 직렬화 확장
if (!fabric.Object.prototype.toObjectWithId) {
  fabric.Object.prototype.toObjectWithId = function (propertiesToInclude) {
    return {
      ...this.toObject(propertiesToInclude),
      id: this.id,
    };
  };
}
fabric.Object.prototype.customProperties = ['id'];

function Hwasang() {
  // 모달 안내 상태
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");

  // 인증 및 사용자 정보 관련 상태와 함수
  const [isLoading, setIsLoading] = useState(true);
  const { tokenInfo, fetchUser, fetchProfileImage } = useGroups();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const authres = await tokenInfo();

        if (authres === -1) {
          window.location.href = "https://login.memoriatest.kro.kr";
          return;
        }

        await fetchUser();
        await fetchProfileImage();
      } catch (error) {
        console.error("Auth initialization failed in Hwasang.js:", error);
        window.location.href = "https://login.memoriatest.kro.kr";
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // 테마 (dark / light)
  const [theme, setTheme] = useState(() =>
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // 상태 선언
  const [socket, setSocket] = useState(null);
  const [socketId, setSocketId] = useState(null);
  const [roomId, setRoomId] = useState("");
  const [nickname, setNickname] = useState("");
  const [isPresenter, setIsPresenter] = useState(false);
  const [joined, setJoined] = useState(false);
  const [presenterId, setPresenterId] = useState("");
  const [presenterNickname, setPresenterNickname] = useState("");
  const [slides, setSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slidesOpen, setSlidesOpen] = useState(true);
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [tab, setTab] = useState("chat");
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isAddingText, setIsAddingText] = useState(false);
  const isDrawingModeRef = useRef(isDrawingMode);
  const isAddingTextRef = useRef(isAddingText);
  const [sendTransport, setSendTransport] = useState(null);
  const [recvTransport, setRecvTransport] = useState(null);
  const [peers, setPeers] = useState([]);
  const [peerNicknames, setPeerNicknames] = useState({});
  const [localStream, setLocalStream] = useState(null);
  const [videoProducer, setVideoProducer] = useState(null);
  const [audioProducer, setAudioProducer] = useState(null);
  const [screenProducer, setScreenProducer] = useState(null);
  const deviceRef = useRef(null);
  const recvTransportRef = useRef(null);
  const consumedProducerIds = useRef(new Set());
  const localVideoRef = useRef(null);
  const audioElementsRef = useRef([]);
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [subtitles, setSubtitles] = useState([]);
  const [liveSubtitle, setLiveSubtitle] = useState("");
  const [peerMicOn, setPeerMicOn] = useState({});
  const [peerScreenOn, setPeerScreenOn] = useState({});
  const [audioStats, setAudioStats] = useState({
    packetsSent: null,
    bytesSent: null,
    audioLevel: null,
  });
  const [slideDrawings, setSlideDrawings] = useState({});
  const pendingTextObjs = useRef([]);

  const roomIdRef = useRef(roomId);
  const nicknameRef = useRef(nickname);
  const isPresenterRef = useRef(isPresenter);
  const currentSlideRef = useRef(currentSlide);

  // 최신값 useRef 업데이트
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);
  useEffect(() => {
    nicknameRef.current = nickname;
  }, [nickname]);
  useEffect(() => {
    isPresenterRef.current = isPresenter;
  }, [isPresenter]);
  useEffect(() => {
    currentSlideRef.current = currentSlide;
  }, [currentSlide]);

  // Fabric.js 캔버스 초기화 및 모드 관리: 드로잉, 텍스트 추가
 useEffect(() => {
    if (!slides.length || !canvasRef.current || !joined) return;
    if (!fabric?.Canvas) return;

    // 기존 캔버스 있으면 정리
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
      fabricCanvasRef.current = null;
    }
    const canvasEl = canvasRef.current;
    const fabricCanvas = new fabric.Canvas(canvasEl, {
      backgroundColor: "transparent",
      width: canvasEl.width,
      height: canvasEl.height,
      selection: true,
    });
    fabricCanvasRef.current = fabricCanvas;

    const brush = new fabric.PencilBrush(fabricCanvas);
    brush.width = 3;
    brush.color = "#ff3333";
    fabricCanvas.freeDrawingBrush = brush;
    fabricCanvas.isDrawingMode = isDrawingModeRef.current;

    // 슬라이드별 그리기 데이터 복원 (id 중복 방지)
    const drawingData = slideDrawings[currentSlide];
    if (drawingData) {
      fabricCanvas.loadFromJSON(drawingData, () => {
        // id 중복 방지: 오브젝트마다 id가 없으면 새로 부여
        fabricCanvas.getObjects().forEach(obj => {
          if (!obj.id) obj.id = generateUniqueId();
        });
        fabricCanvas.renderAll();
      });
    } else {
      // drawingData 없으면 빈 JSON이라도 loadFromJSON 호출하여 최종 초기화 보장
      fabricCanvas.loadFromJSON({}, () => {
        fabricCanvas.renderAll();
      });
    }

    // ▶ 큐에 쌓인 텍스트 동기화 대기 중인 항목 처리
    if (pendingTextObjs.current.length > 0) {
      pendingTextObjs.current.forEach(({ textObj, slideIndex }) => {
        if (slideIndex === currentSlide) {
          const allowed = [
            "left", "top", "width", "height", "fill", "fontSize", "fontWeight", "fontFamily",
            "fontStyle", "lineHeight", "text", "charSpacing", "textAlign", "styles", "underline",
            "overline", "linethrough", "textBackgroundColor", "direction", "angle", "scaleX",
            "scaleY", "flipX", "flipY", "opacity", "shadow", "visible", "backgroundColor",
            "skewX", "skewY", "id"
          ];
          let obj = fabricCanvas.getObjects().find(o => o.id === textObj.id);
          if (!obj) {
            const { id, text, type, ...safeProps } = textObj;
            const uniqueId = id && !fabricCanvas.getObjects().some(o => o.id === id) ? id : generateUniqueId();
            obj = new fabric.IText(text, { ...safeProps, id: uniqueId });
            fabricCanvas.add(obj);
          }
          fabricCanvas.renderAll();
          setSlideDrawings(prev => ({
            ...prev,
            [currentSlide]: fabricCanvas.toJSON()
          }));
        }
      });
      // 큐 비우기
      pendingTextObjs.current = [];
    }

    // [1] path:created => draw-path emit (펜/그리기)
    fabricCanvas.on("path:created", (e) => {
      if (!isDrawingModeRef.current) return;
      const path = e.path;
      // 항상 새 id 부여
      path.id = generateUniqueId();
      const pathObj = path.toObjectWithId();
      setTimeout(() => {
        socket.emit("draw-path", {
          roomId: roomIdRef.current,
          path: pathObj,
          slideIndex: currentSlideRef.current,
        });
      }, 300);
    });

    // [2] 텍스트 관련 이벤트 => draw-text emit
    const emitText = (obj) => {
      if (obj && (obj.type === "i-text" || obj.type === "IText")) {
        // 항상 새 id 부여(새 텍스트일 때만)
        if (!obj.id) obj.id = generateUniqueId();
        const textObj = obj.toObjectWithId();
        socket.emit("draw-text", {
          roomId: roomIdRef.current,
          textObj,
          slideIndex: currentSlideRef.current,
        });
      }
    };
    fabricCanvas.on("text:changed", (e) => emitText(e.target));
    fabricCanvas.on("object:modified", (e) => emitText(e.target));

    // 텍스트 삭제 동기화 (remove-path 재활용)
    fabricCanvas.on("object:removed", (e) => {
      const obj = e.target;
      if (obj && (obj.type === "i-text" || obj.type === "IText")) {
        socket.emit("remove-path", {
          roomId: roomIdRef.current,
          objId: obj.id,
          slideIndex: currentSlideRef.current,
        });
      }
    });

const onKeyDown = (e) => {
  if (e.key === "Delete") {
    const fabricCanvas = fabricCanvasRef.current;
    const activeObjects = fabricCanvas.getActiveObjects();

    if (activeObjects.length > 0) {
      activeObjects.forEach((obj) => {
        // id가 없으면 생성하여 부여
        if (!obj.id) {
          obj.id = generateUniqueId();
          console.warn("자동으로 id 부여:", obj);
        }
        socket.emit("remove-path", {
          roomId: roomIdRef.current,
          objId: obj.id,
          slideIndex: currentSlideRef.current,
        });
      });

      fabricCanvas.discardActiveObject();
      fabricCanvas.requestRenderAll();
    }
  }
};

window.addEventListener("keydown", onKeyDown);

    return () => {
      fabricCanvas.off("path:created");
      fabricCanvas.off("text:changed");
      fabricCanvas.off("object:modified");
      fabricCanvas.off("object:removed");
      window.removeEventListener("keydown", onKeyDown);
      fabricCanvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [slides, currentSlide, joined, roomId, socket, slideDrawings]);



  // 텍스트 추가 모드
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const fabricCanvas = fabricCanvasRef.current;
    fabricCanvas.isDrawingMode = isDrawingMode;
    const onCanvasClick = (options) => {
      if (!isAddingTextRef.current) return;
      const pointer = fabricCanvas.getPointer(options.e);
      const text = new fabric.IText("텍스트를 입력하세요", {
        left: pointer.x,
        top: pointer.y,
        fontSize: 20,
        fill: "#000",
        id: generateUniqueId(), // 항상 새 id 부여
      });
      fabricCanvas.add(text);
      fabricCanvas.setActiveObject(text);
      fabricCanvas.renderAll();
      setTimeout(() => {
        text.enterEditing();
        text.selectAll();
      }, 10);
    };
    if (isAddingText) {
      fabricCanvas.on("mouse:up", onCanvasClick);
    } else {
      fabricCanvas.off("mouse:up", onCanvasClick);
    }
    return () => {
      fabricCanvas.off("mouse:up", onCanvasClick);
    };
  }, [isDrawingMode, isAddingText]);

  // 슬라이드 넘어갈 때 현재 캔버스 저장
  const saveCurrentSlideDrawing = () => {
    if (fabricCanvasRef.current) {
      setSlideDrawings((prev) => ({
        ...prev,
        [currentSlideRef.current]: fabricCanvasRef.current.toJSON(),
      }));
    }
  };

  // 소켓 연결 및 이벤트 리스너
  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      setSocketId(newSocket.id);
      console.log("[디버그] 소켓 연결됨, socketId:", newSocket.id);
    });

    newSocket.on("slides-update", (slidesArr) => {
      setSlides(slidesArr);
      setCurrentSlide(0);
      setSlidesOpen(true);
    });

    newSocket.on("update-slide", ({ roomId: rId, index }) => {
      if (rId === roomIdRef.current) setCurrentSlide(index);
    });

newSocket.on("draw-path", ({ roomId: rId, path, slideIndex }) => {
      if (rId !== roomIdRef.current) return;
      if (slideIndex !== currentSlideRef.current) return;
      if (!fabricCanvasRef.current || !path) return;
      const canvas = fabricCanvasRef.current;
      if (path.type !== "path" && path.type !== "Path") return;
      const { id, path: pathData, type, ...safeProps } = JSON.parse(JSON.stringify(path));
      // id 중복 방지: 이미 해당 id가 있으면 새 id로 생성
      let obj = canvas.getObjects().find(o => o.id === id);
      if (!obj) {
        const uniqueId = id && !canvas.getObjects().some(o => o.id === id) ? id : generateUniqueId();
        obj = new fabric.Path(pathData, { ...safeProps, id: uniqueId });
        canvas.add(obj);
      }
      canvas.renderAll();
      setSlideDrawings(prev => ({
        ...prev,
        [currentSlideRef.current]: canvas.toJSON()
      }));
    });

newSocket.on("draw-text", ({ roomId: rId, textObj, slideIndex }) => {
  if (rId !== roomIdRef.current) return;
  if (slideIndex !== currentSlideRef.current) return;
  if (!textObj) return;

  // 캔버스가 준비 전이면 큐에 적재
  if (!fabricCanvasRef.current) {
    pendingTextObjs.current.push({ textObj, slideIndex });
    return;
  }

  // ※ 아래는 기존의 텍스트 추가 로직 그대로 둠
  const canvas = fabricCanvasRef.current;
  const allowed = [
    "left", "top", "width", "height", "fill", "fontSize", "fontWeight", "fontFamily",
    "fontStyle", "lineHeight", "text", "charSpacing", "textAlign", "styles", "underline",
    "overline", "linethrough", "textBackgroundColor", "direction", "angle", "scaleX",
    "scaleY", "flipX", "flipY", "opacity", "shadow", "visible", "backgroundColor",
    "skewX", "skewY", "id"
  ];
  let obj = canvas.getObjects().find(o => o.id === textObj.id);
  if (obj) {
    const safeProps = {};
    for (const key of allowed) {
      if (textObj[key] !== undefined) safeProps[key] = textObj[key];
    }
    obj.set(safeProps);
    canvas.renderAll();
    setSlideDrawings(prev => ({
      ...prev,
      [currentSlideRef.current]: canvas.toJSON()
    }));
    return;
  }
  // 새로 추가 (id 중복 방지)
  try {
    const { id, text, type, ...safeProps } = textObj;
    const uniqueId = id && !canvas.getObjects().some(o => o.id === id) ? id : generateUniqueId();
    obj = new fabric.IText(text, { ...safeProps, id: uniqueId });
    canvas.add(obj);
    canvas.renderAll();
    setSlideDrawings(prev => ({
      ...prev,
      [currentSlideRef.current]: canvas.toJSON()
    }));
  } catch (e) {
    console.error("[디버그] draw-text 처리 실패:", e);
  }
});


// 소켓 수신부
newSocket.on("remove-path", ({ roomId: rId, objId, slideIndex }) => {
  if (!objId) return; // id 없으면 아무 것도 하지 않음
  if (
    rId !== roomIdRef.current ||
    slideIndex !== currentSlideRef.current ||
    !fabricCanvasRef.current
  ) return;
  const canvas = fabricCanvasRef.current;
  const obj = canvas.getObjects().find((o) => o.id === objId);
  if (obj) {
    canvas.remove(obj);
    canvas.renderAll();
    setSlideDrawings((prev) => ({ ...prev, [currentSlideRef.current]: canvas.toJSON() }));
  }
});



    newSocket.on("new-peer", ({ peerId, nickname }) => {
      setPeers((prev) => [...prev, peerId]);
      setPeerNicknames((prev) => ({ ...prev, [peerId]: nickname }));
    });

    newSocket.on("peer-left", ({ peerId }) => {
      setPeers((prev) => prev.filter((id) => id !== peerId));
      setPeerNicknames((prev) => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
      setPeerMicOn((prev) => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
      setPeerScreenOn((prev) => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
      const container = document.getElementById(`remote-media-${peerId}`);
      if (container) container.remove();
    });

    newSocket.on("receive-chat-message", (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    newSocket.on("stt-result", ({ producerId, transcript, isFinal, peerNickname }) => {
      if (isFinal) {
        setSubtitles((prev) => [...prev, { producerId, text: transcript, peerNickname, time: Date.now() }]);
        setLiveSubtitle("");
      } else {
        setLiveSubtitle(`${peerNickname}: ${transcript}`);
      }
    });

    newSocket.on("producer-closed", ({ producerId }) => {
      const videoEl = document.getElementById(`video-${producerId}`);
      if (videoEl) videoEl.remove();
      const audioEl = document.getElementById(`audio-${producerId}`);
      if (audioEl) audioEl.remove();
    });

    newSocket.on("peer-media-state", ({ peerId, micOn, screenOn }) => {
      setPeerMicOn((prev) => ({ ...prev, [peerId]: micOn }));
      setPeerScreenOn((prev) => ({ ...prev, [peerId]: screenOn }));
    });

    newSocket.on("slide-close", () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
      setSlides([]);
      setCurrentSlide(0);
      setSlidesOpen(false);
    });

    newSocket.on("presenter-changed", ({ presenterId, presenterNickname }) => {
      setPresenterId(presenterId);
      setPresenterNickname(presenterNickname);
    });

    newSocket.on("force-mute", () => {
      setMicOn(false);
      if (localStream) {
        localStream.getAudioTracks().forEach((track) => (track.enabled = false));
      }
      newSocket.emit("change-media-state", {
        roomId: roomIdRef.current,
        peerId: newSocket.id,
        micOn: false,
        screenOn,
      });
    });

    return () => newSocket.disconnect();
  }, []);

  useEffect(() => {
    isDrawingModeRef.current = isDrawingMode;
  }, [isDrawingMode]);
  useEffect(() => {
    isAddingTextRef.current = isAddingText;
  }, [isAddingText]);

  const createDevice = async (rtpCapabilities) => {
    const device = new mediasoupClient.Device();
    await device.load({ routerRtpCapabilities: rtpCapabilities });
    deviceRef.current = device;
    return device;
  };

  const createSendTransport = (device, transportOptions) => {
    const transport = device.createSendTransport(transportOptions);
    transport.on("connect", ({ dtlsParameters }, callback, errback) => {
      socket.emit(
        "connect-transport",
        { transportId: transport.id, dtlsParameters, roomId: roomIdRef.current, peerId: socketId },
        (res) => (res.error ? errback(res.error) : callback())
      );
    });
    transport.on("produce", ({ kind, rtpParameters, appData }, callback, errback) => {
      socket.emit(
        "produce",
        {
          transportId: transport.id,
          kind,
          rtpParameters,
          roomId: roomIdRef.current,
          peerId: socketId,
          type: appData?.type,
        },
        (res) => {
          if (res.error) return errback(new Error(res.error));
          callback({ id: res.producerId });
        }
      );
    });
    setSendTransport(transport);
    return transport;
  };

  const createRecvTransport = (device, transportOptions) => {
    const transport = device.createRecvTransport(transportOptions);
    transport.on("connect", ({ dtlsParameters }, callback, errback) => {
      socket.emit(
        "connect-transport",
        { transportId: transport.id, dtlsParameters, roomId: roomIdRef.current, peerId: socketId },
        (res) => (res.error ? errback(res.error) : callback())
      );
    });
    recvTransportRef.current = transport;
    setRecvTransport(transport);
    return transport;
  };

  // joinRoom 함수 (모달 상태 활용 포함)
  const joinRoom = async (customRoomId, customNickname, customSubjectId) => {
    if (joined) return;
    if (!customRoomId?.trim() || !customNickname?.trim()) return;

    setRoomId(customRoomId);
    setNickname(customNickname);

    let audioStream = null;
    let audioTrack = null;
    let audioChannels = 0;

    try {
      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: { ideal: 2 } },
      });
      audioTrack = audioStream.getAudioTracks()[0];
      audioChannels = audioTrack?.getSettings().channelCount || 1;
    } catch (err) {
      setAlertMsg("마이크 장치가 감지되지 않았습니다.\n듣기 전용으로 입장합니다.");
      setAlertOpen(true);
      audioStream = null;
      audioTrack = null;
      audioChannels = 0;
    }

    socket.emit(
      "join-room",
      {
        groupId: customRoomId,
        peerId: socketId,
        nickname: customNickname,
        subject_id: customSubjectId,
        audioChannels,
      },
      async (res) => {
        if (!res || res.error) {
          setAlertMsg(`방 참가 실패: ${res?.error || "서버 응답 없음"}`);
          setAlertOpen(true);
          setRoomId("");
          setNickname("");
          return;
        }

        setPresenterId(res.presenterId || "");
        setPresenterNickname(res.presenterNickname || "");
        setIsPresenter(res.yourPermission === 1);

        const {
          rtpCapabilities,
          sendTransportOptions,
          recvTransportOptions,
          peerIds,
          existingProducers,
          chatHistory,
          peerNicknames: serverPeerNicknames,
        } = res;

        if (chatHistory) setChatMessages(chatHistory);
        if (serverPeerNicknames) setPeerNicknames(serverPeerNicknames);

        const device = await createDevice(rtpCapabilities);
        const iceServers = [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ];
        const sendTransport = createSendTransport(device, {
          ...sendTransportOptions,
          iceServers,
        });
        createRecvTransport(device, { ...recvTransportOptions, iceServers });

        socket.off("new-producer", handleNewProducer);
        socket.on("new-producer", handleNewProducer);

        consumedProducerIds.current.clear();
        clearRemoteMedia();

        if (audioTrack) {
          const audioProducer = await sendTransport.produce({ track: audioTrack });
          setAudioProducer(audioProducer);
          setLocalStream(audioStream);
        } else {
          setAudioProducer(null);
          setLocalStream(null);
        }

        setPeers(peerIds.filter((id) => id !== socketId));

        if (existingProducers) {
          for (const p of existingProducers) {
            await safeConsume(p);
          }
        }

        setJoined(true);
        setCamOn(false);

        socket.emit("change-media-state", {
          roomId: customRoomId,
          peerId: socketId,
          micOn: !!audioTrack,
          screenOn,
        });
      }
    );
  };

  // New producer 이벤트 핸들러
  const handleNewProducer = async (data) => {
    console.log("[디버그] new-producer 이벤트 수신:", data);
    if (!data.kind) return;
    await safeConsume(data);
  };

  // 소비 함수
const consume = async ({ producerId, kind, type, peerId }) => {
  const device = deviceRef.current;
  const transport = recvTransportRef.current;
  if (!device || !transport) {
    console.warn("[consume] device 또는 transport 미준비, 재시도 예정", { producerId, kind, peerId });
    return setTimeout(() => consume({ producerId, kind, type, peerId }), 500);
  }

  console.log(`[consume] 요청: producerId=${producerId}, kind=${kind}, peerId=${peerId}`);

  socket.emit(
    "consume",
    {
      transportId: transport.id,
      producerId,
      roomId: roomIdRef.current,
      peerId: socketId,
      rtpCapabilities: device.rtpCapabilities,
    },
    async (res) => {
      if (res.error) return console.error("[consume] 서버 에러:", res.error);

      try {
        const { consumerData } = res;
        console.log("[consume] 서버 응답 consumerData:", consumerData);

        const consumer = await transport.consume(consumerData);
        console.log("[consume] consumer 생성 완료:", consumer);

        await consumer.resume();
        const stream = new MediaStream([consumer.track]);
        console.log(
          `[consume] MediaStream 생성 완료 for ${kind}, producerId=${producerId}`,
          "track 상태:",
          consumer.track ? {
            readyState: consumer.track.readyState,
            enabled: consumer.track.enabled,
            muted: consumer.track.muted
          } : "track 없음"
        );

        const container = document.getElementById(`remote-media-${peerId}`);
        console.log(`[consume] remote container ${container ? "존재함" : "없음"} for peerId=${peerId}`);

        if (container) {
          const oldEl = document.getElementById(`${kind}-${producerId}`);
          if (oldEl) {
            console.log(`[consume] 기존 ${kind} 엘리먼트 제거: id=${oldEl.id}`);
            oldEl.remove();
          }
          const el = document.createElement(kind);
          el.id = `${kind}-${producerId}`;
          el.srcObject = stream;
          el.autoplay = true;
          el.playsInline = true;
          if (kind === "video") el.muted = true;

          container.appendChild(el);

          setTimeout(() => {
            // 요소의 현재 readyState/트랙 상태 확인
            const videoTracks = el.srcObject?.getVideoTracks?.();
            if (kind === "video" && videoTracks && videoTracks[0]) {
              console.log(
                `[consume] <video> track 상태(readyState, enabled, muted):`,
                videoTracks[0].readyState,
                videoTracks[0].enabled,
                videoTracks[0].muted
              );
            }
          }, 500);

          console.log(`[consume] 새 ${kind} 엘리먼트 추가: id=${el.id}`);

          el.play()
            .then(() => console.log(`[consume] ${kind} play 시작: id=${el.id}`))
            .catch((e) => console.error(`[consume] ${kind} play 에러: id=${el.id}`, e));
        } else {
          console.warn(`[consume] remote-media-${peerId} 컨테이너 미발견`);
        }
      } catch (error) {
        console.error(`[consume] ${kind} consumer 처리 중 에러:`, error);
      }
    }
  );
};



  const safeConsume = async (p) => {
    if (!p || consumedProducerIds.current.has(p.producerId)) return;
    await consume({ producerId: p.producerId, kind: p.kind, type: p.type, peerId: p.peerId });
    consumedProducerIds.current.add(p.producerId);
  };

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    socket.emit("send-chat-message", { roomId: roomIdRef.current, peerId: socketId, nickname: nicknameRef.current, message: chatInput });
    setChatInput("");
  };

  const tryPlayAudio = () => {
    audioElementsRef.current.forEach((el) => el.play().catch(console.warn));
    setAudioPlaybackBlocked(false);
    audioElementsRef.current = [];
  };

  const clearRemoteMedia = () => {
    peers.forEach((peerId) => {
      const container = document.getElementById(`remote-media-${peerId}`);
      if (container) container.innerHTML = "";
    });
  };

  // 카메라 시작
// camera start: 영상 프리뷰 + Producer 생성까지 한 번에 완성 예제
const startCamera = async () => {
  if (!sendTransport) {
    console.warn("Send transport is not ready.");
    setAlertMsg("회의에 먼저 입장해 주세요.");
    setAlertOpen(true);
    return;
  }

  try {
    // ① 캠 stream 얻기
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { max: 640 }, height: { max: 480 } },
      audio: true,
    });
    console.log("[디버그] 카메라 스트림 획득:", stream);

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      console.warn("[디버그] videoTrack 없음", stream);
      setAlertMsg("카메라 장치를 찾을 수 없습니다.");
      setAlertOpen(true);
      setCamOn(false);
      return;
    }

    console.log(
      "[디버그] videoTrack 상태:",
      "readyState:", videoTrack.readyState,
      "enabled:", videoTrack.enabled,
      "muted:", videoTrack.muted
    );

    // ② 내 캠 프리뷰
    const mergedStream = new MediaStream([
      ...(localStream?.getAudioTracks() || []),
      videoTrack
    ]);
    setLocalStream(mergedStream);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = mergedStream;
      console.log("[디버그] localVideoRef 프리뷰 연결됨");
    }

    // ③ 이미 Producer 있으면 닫기 (중복 방지)
    if (videoProducer) {
      await videoProducer.close();
      setVideoProducer(null);
      console.log("[디버그] 기존 videoProducer close 완료");
    }

    // ④ Producer 생성(실제 송출)
    const producer = await sendTransport.produce({
      track: videoTrack,
      appData: { type: "video" }
    });

    // producer 생성 후 PeerConnection sender 연결 상태 체크
    const senders = sendTransport._handler?._pc?.getSenders?.();
    if (senders) {
      senders
        .filter(s => s.track && s.track.kind === "video")
        .forEach((s, idx) => {
          console.log(
            `[디버그] sender[${idx}] video track:`,
            s.track,
            "readyState:", s.track.readyState,
            "enabled:", s.track.enabled,
            "muted:", s.track.muted
          );
        });
    } else {
      console.log("[디버그] PeerConnection senders 미확인");
    }

    console.log("[디버그] Video producer 생성됨:", producer);

    producer.on("trackended", () => {
      console.log("[디버그] video track 종료 이벤트(trackedned)");
      stopCamera();
    });

    setVideoProducer(producer);
    setCamOn(true);
  } catch (error) {
    console.error("Failed to get video stream:", error);
    setAlertMsg("카메라를 시작할 수 없습니다. 권한/장치/환경을 확인해주세요.");
    setAlertOpen(true);
    setCamOn(false);
  }
};



  // 카메라 중지
  const stopCamera = () => {
    if (!videoProducer) return;
    videoProducer.close();
    setVideoProducer(null);
    if (localStream) {
      localStream.getVideoTracks().forEach(track => { track.stop(); localStream.removeTrack(track); });
      setLocalStream(new MediaStream(localStream.getTracks()));
    }
    setCamOn(false);
  };

  // 마이크 토글
  const handleMicToggle = () => {
    setMicOn((prev) => {
      const next = !prev;
      localStream?.getAudioTracks().forEach(track => track.enabled = next);
      socket?.emit("change-media-state", { roomId: roomIdRef.current, peerId: socketId, micOn: next, screenOn });
      return next;
    });
  };

  // 방 나가기
  const leaveRoom = async () => {
    if (!socket || !joined) return;

    socket.emit("leave-room", { roomId: roomIdRef.current, peerId: socketId }, async () => {
      setJoined(false);
      if(localStream) localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
      await sendTransport?.close();
      await recvTransport?.close();
      setSendTransport(null);
      setRecvTransport(null);
      setVideoProducer(null);
      setAudioProducer(null);
      socket.off("new-producer", handleNewProducer);
      consumedProducerIds.current.clear();
      setPeers([]);
      setPeerNicknames({});
      setRoomId("");
      setNickname("");
    });
  };

  // 화면 공유 시작
const startScreenShare = async () => {
  if (!sendTransport) {
    console.warn("Send transport is not ready.");
    return;
  }
  try {
    // 사용자 화면 공유 스트림 획득
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    const videoTrack = stream.getVideoTracks()[0];

    // 만약 기존에 화면 공유 프로듀서가 있다면 중지
    if (screenProducer) {
      await screenProducer.close();
      setScreenProducer(null);
    }

    const producer = await sendTransport.produce({
      track: videoTrack,
      appData: { type: "screen" },
    });

    // 트랙 종료시 화면 공유 종료 처리
    videoTrack.onended = () => {
      stopScreenShare();
    };

    setScreenProducer(producer);
    setScreenOn(true);

    // 서버에 화면 공유 상태 변경 알림
    socket?.emit("change-media-state", {
      roomId: roomIdRef.current,
      peerId: socketId,
      micOn,
      screenOn: true,
    });
  } catch (error) {
    console.error("화면 공유를 시작할 수 없습니다:", error);
    setAlertMsg("화면 공유를 시작할 수 없습니다.\n권한이나 장치 상태를 확인하세요.");
    setAlertOpen(true);
  }
};

// 화면 공유 중지
const stopScreenShare = async () => {
  if (!screenProducer) return;
  try {
    await screenProducer.close();
  } catch (error) {
    console.error("화면 공유 프로듀서 종료 중 오류:", error);
  }
  setScreenProducer(null);
  setScreenOn(false);

  // 서버에 화면 공유 중지 상태 알림
  socket?.emit("change-media-state", {
    roomId: roomIdRef.current,
    peerId: socketId,
    micOn,
    screenOn: false,
  });
};


  // 화면 공유 기능 (빈 함수 예시, 필요시 구현)
const handleScreenToggle = () => {
  if (screenOn) {
    stopScreenShare();
  } else {
    startScreenShare();
  }
};


  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      saveCurrentSlideDrawing();
      const next = currentSlide + 1;
      setCurrentSlide(next);
      socket.emit("update-slide", { roomId: roomIdRef.current, index: next });
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      saveCurrentSlideDrawing();
      const prev = currentSlide - 1;
      setCurrentSlide(prev);
      socket.emit("update-slide", { roomId: roomIdRef.current, index: prev });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("roomId", roomIdRef.current);
    const res = await fetch(`${SERVER_URL}/upload`, { method: "POST", body: formData });
    const data = await res.json();
    setSlides(data.slides);
    setCurrentSlide(0);
    setSlidesOpen(true);
    socket.emit("update-slide", { roomId: roomIdRef.current, index: 0 });
    setPresenterId(socketId);
    setPresenterNickname(nicknameRef.current);
    socket.emit("change-presenter", { roomId: roomIdRef.current, presenterId: socketId, presenterNickname: nicknameRef.current });
  };

  const closeSlides = () => {
    if (fabricCanvasRef.current) fabricCanvasRef.current.dispose();
    setSlides([]);
    setCurrentSlide(0);
    setSlidesOpen(false);
    socket?.emit("slide-close", { roomId: roomIdRef.current });
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        인증 정보를 확인하는 중입니다...
      </div>
    );
  }

  return (
    <div className={`home-screen ${theme}`}>
      <Dialog open={alertOpen} onClose={() => setAlertOpen(false)}>
        <DialogTitle>안내</DialogTitle>
        <DialogContent>
          <Typography style={{ whiteSpace: "pre-line" }}>{alertMsg}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertOpen(false)} variant="contained" autoFocus>확인</Button>
        </DialogActions>
      </Dialog>

      {!joined ? (
        <JoinRoomUI
          isPresenter={isPresenter}
          setIsPresenter={setIsPresenter}
          roomId={roomId}
          setRoomId={setRoomId}
          handleJoinRoom={(finalNickname, subjectId) => {
            if (!roomId.trim() || !finalNickname.trim()) {
              setAlertMsg("그룹 ID와 닉네임을 입력해주세요.");
              setAlertOpen(true);
              return;
            }
            joinRoom(roomId, finalNickname, subjectId);
          }}
        />
      ) : (
        <MeetingRoomUI
          roomId={roomId}
          nickname={nickname}
          isPresenter={isPresenter}
          presenterId={presenterId}
          presenterNickname={presenterNickname}
          slides={slides}
          currentSlide={currentSlide}
          slidesOpen={slidesOpen}
          setSlidesOpen={setSlidesOpen}
          canvasRef={canvasRef}
          isDrawingMode={isDrawingMode}
          setIsDrawingMode={setIsDrawingMode}
          isAddingText={isAddingText}
          setIsAddingText={setIsAddingText}
          micOn={micOn}
          camOn={camOn}
          screenOn={screenOn}
          tab={tab}
          setTab={setTab}
          peers={peers}
          peerNicknames={peerNicknames}
          localStream={localStream}
          localVideoRef={localVideoRef}
          leaveRoom={leaveRoom}
          sendChatMessage={sendChatMessage}
          chatMessages={chatMessages}
          chatInput={chatInput}
          setChatInput={setChatInput}
          subtitles={subtitles}
          liveSubtitle={liveSubtitle}
          peerMicOn={peerMicOn}
          peerScreenOn={peerScreenOn}
          onMutePeer={() => {}}
          audioStats={audioStats}
          startCamera={startCamera}
          stopCamera={stopCamera}
          startScreenShare={startScreenShare}
          stopScreenShare={stopScreenShare}
          handleMicToggle={handleMicToggle}
          handleScreenToggle={handleScreenToggle}
          handleFileUpload={handleFileUpload}
          closeSlides={closeSlides}
          nextSlide={nextSlide}
          prevSlide={prevSlide}
          tryPlayAudio={() => {}}
          audioPlaybackBlocked={audioPlaybackBlocked}
        />
      )}
    </div>
  );
}

export default Hwasang;
