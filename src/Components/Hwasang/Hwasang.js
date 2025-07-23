import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";
import * as fabric from "fabric";
import "./styles/global.css";
import MeetingRoomUI from "./MeetingRoomUI";
import "./MeetingRoom.css";
import JoinRoomUI from "./JoinRoomUI";
import "./HomeScreen.css";

const SERVER_URL = "https://hwasang.memoriatest.kro.kr";

function generateUniqueId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// === Fabric 오브젝트에 id 직렬화 포함 ===
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
  // 테마 및 시간
 const [theme, setTheme] = useState(() =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light"
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = e => setTheme(e.matches ? "dark" : "light");
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
  const [camOn, setCamOn] = useState(true);
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

  // 슬라이드별 그리기 데이터 저장
  const [slideDrawings, setSlideDrawings] = useState({});

  // --- useRef로 최신값 관리 ---
  const roomIdRef = useRef(roomId);
  const nicknameRef = useRef(nickname);
  const isPresenterRef = useRef(isPresenter);
  const currentSlideRef = useRef(currentSlide);

  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { nicknameRef.current = nickname; }, [nickname]);
  useEffect(() => { isPresenterRef.current = isPresenter; }, [isPresenter]);
  useEffect(() => { currentSlideRef.current = currentSlide; }, [currentSlide]);

  // 참가자 강제 음소거 처리 함수
  const onMutePeer = (peerId) => {
    if (socket && roomIdRef.current) {
      socket.emit("mute-peer", { roomId: roomIdRef.current, peerId });
    }
  };

  // 소켓 연결 및 이벤트 핸들러 등록
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

    // === [1] draw-path (펜/그리기) 수신 ===
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

    // === [2] draw-text (텍스트) 수신 ===
    newSocket.on("draw-text", ({ roomId: rId, textObj, slideIndex }) => {
      if (rId !== roomIdRef.current) return;
      if (slideIndex !== currentSlideRef.current) return;
      if (!fabricCanvasRef.current || !textObj) return;
      const canvas = fabricCanvasRef.current;
      const allowed = [
        "left", "top", "width", "height", "fill", "fontSize", "fontWeight", "fontFamily",
        "fontStyle", "lineHeight", "text", "charSpacing", "textAlign", "styles", "underline",
        "overline", "linethrough", "textBackgroundColor", "direction", "angle", "scaleX",
        "scaleY", "flipX", "flipY", "opacity", "shadow", "visible", "backgroundColor",
        "skewX", "skewY"
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

    // === remove-path 수신 ===
    newSocket.on("remove-path", ({ roomId: rId, objId, slideIndex }) => {
      if (rId !== roomIdRef.current) return;
      if (slideIndex !== currentSlideRef.current) return;
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const obj = canvas.getObjects().find(o => o.id === objId);
      if (obj) {
        canvas.remove(obj);
        canvas.renderAll();
        setSlideDrawings(prev => ({
          ...prev,
          [currentSlideRef.current]: canvas.toJSON()
        }));
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
      setPeerMicOn(prev => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
      setPeerScreenOn(prev => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
    });

    newSocket.on("receive-chat-message", (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    newSocket.on("stt-result", ({ producerId, transcript, isFinal, peerNickname }) => {
      if (isFinal) {
        setSubtitles((prev) => [
          ...prev,
          { producerId, text: transcript, peerNickname, time: Date.now() },
        ]);
        setLiveSubtitle("");
      } else {
        setLiveSubtitle(`${peerNickname}: ${transcript}`);
      }
    });

    newSocket.on("producer-closed", ({ producerId, type }) => {
      if (type === "screen") {
        const el = document.getElementById("screen-share");
        if (el) el.remove();
      }
    });

    newSocket.on("peer-media-state", ({ peerId, micOn, screenOn }) => {
      setPeerMicOn(prev => ({ ...prev, [peerId]: micOn }));
      setPeerScreenOn(prev => ({ ...prev, [peerId]: screenOn }));
    });

    newSocket.on("slide-close", () => {
      if (fabricCanvasRef.current) {
    fabricCanvasRef.current.dispose();
    fabricCanvasRef.current = null; // 참조를 깨끗이 비웁니다.
  }

  // 2. 수동 정리가 끝난 후, React 상태를 업데이트하여 UI를 안전하게 제거합니다.
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

  // 슬라이드별 그리기 데이터 저장 함수
  const saveCurrentSlideDrawing = () => {
    if (fabricCanvasRef.current) {
      setSlideDrawings(prev => {
        const updated = {
          ...prev,
          [currentSlideRef.current]: fabricCanvasRef.current.toJSON()
        };
        return updated;
      });
    }
  };

  // === 슬라이드 변경 시 캔버스 초기화 및 동기화 이벤트 등록 ===
  useEffect(() => {
    if (!slides.length || !canvasRef.current || !joined) return;
    if (!fabric?.Canvas) return;
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

    // Delete 키로 오브젝트 삭제
    const onKeyDown = (e) => {
      if (e.key === "Delete") {
        const activeObject = fabricCanvas.getActiveObject();
        if (activeObject) {
          fabricCanvas.remove(activeObject);
          fabricCanvas.renderAll();
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

  // mediasoup 디바이스 생성
  const createDevice = async (rtpCapabilities) => {
    const device = new mediasoupClient.Device();
    await device.load({ routerRtpCapabilities: rtpCapabilities });
    deviceRef.current = device;
    return device;
  };

  // Send Transport 생성
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
        { transportId: transport.id, kind, rtpParameters, roomId: roomIdRef.current, peerId: socketId, type: appData?.type },
        (res) => {
          if (res.error) {
            errback(new Error(res.error));
            return;
          }
          callback({ id: res.producerId });
        }
      );
    });
    setSendTransport(transport);
    return transport;
  };

  // Recv Transport 생성
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

  // 방 생성 함수 (랜덤 6자리)
  const generateRoomId = () => {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  };

  // 방 생성 및 즉시 입장
  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();
    socket.emit("create-room", { roomId: newRoomId }, (res) => {
      if (!res.success) {
        alert("방 생성 실패: " + (res.error || "알 수 없는 오류"));
        return;
      }
      setRoomId(newRoomId);
    });
  };

  // 방 참가
  const handleJoinRoom = () => {
    if (!roomId.trim() || !nickname.trim()) {
      alert("방 ID와 닉네임을 입력하세요.");
      return;
    }
    joinRoom(roomId, nickname, isPresenter);
  };

  // 방 참가
  const joinRoom = async (customRoomId, customNickname, customPresenter) => {
    if (joined) {
      alert("이미 방에 참가 중입니다.");
      return;
    }
    // 이제 customRoomId는 실제로는 groupId를 의미합니다.
    if (!customRoomId?.trim() || !customNickname?.trim()) {
      alert("그룹 ID와 닉네임이 필요합니다.");
      return;
    }
    setRoomId(customRoomId); // 상태에는 여전히 roomId라는 이름으로 groupId를 저장합니다.
    setNickname(customNickname);
    setIsPresenter(customPresenter);

    let audioStream;
    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: { ideal: 2 } } });
    } catch (err) {
      alert("마이크 권한이 필요합니다.");
      return;
    }

    const audioTrack = audioStream.getAudioTracks()[0];
    const settings = audioTrack.getSettings();
    const audioChannels = settings.channelCount || 1;

    // ✅✅✅ 핵심 수정 지점 ✅✅✅
    // 서버의 통합된 'join-room' 핸들러를 호출합니다.
    // 'roomId' 키를 'groupId'로 변경하여 전송합니다.
    socket.emit(
      "join-room",
      { groupId: customRoomId, peerId: socketId, nickname: customNickname, audioChannels },
      async (res) => {
        if (!res) {
          alert("서버 응답이 없습니다.");
          return;
        }
        if (res.error) {
          alert(`방 참가 실패: ${res.error}`);
          // 실패 시, 상태 초기화
          setRoomId("");
          setNickname("");
          return;
        }

        // --- 여기부터는 기존 응답 처리 로직과 동일합니다. ---
        const {
          rtpCapabilities,
          sendTransportOptions,
          recvTransportOptions,
          peerIds,
          existingProducers,
          chatHistory,
          peerNicknames: serverPeerNicknames,
          presenterId: serverPresenterId,
          presenterNickname: serverPresenterNickname,
        } = res;

        if (chatHistory) setChatMessages(chatHistory);
        if (serverPeerNicknames) setPeerNicknames(serverPeerNicknames);
        if (serverPresenterId && serverPresenterNickname) {
          setPresenterId(serverPresenterId);
          setPresenterNickname(serverPresenterNickname);
        }

        const device = await createDevice(rtpCapabilities);
        
        const iceServers = [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ];

        const sendTransport = createSendTransport(device, { ...sendTransportOptions, iceServers });
        createRecvTransport(device, { ...recvTransportOptions, iceServers });

        socket.off("new-producer", handleNewProducer);
        socket.on("new-producer", handleNewProducer);

        consumedProducerIds.current.clear();
        clearRemoteMedia();

        const audioProducer = await sendTransport.produce({ track: audioTrack });
        setAudioProducer(audioProducer);
        setLocalStream(audioStream);
        setPeers(peerIds.filter((id) => id !== socketId));

        for (const p of existingProducers) {
          await safeConsume(p);
        }

        setJoined(true);

        socket.emit("change-media-state", {
          // 여기서 보내는 roomId는 실제로는 groupId이므로 서버에서 정상적으로 처리됩니다.
          roomId: customRoomId,
          peerId: socketId,
          micOn,
          screenOn,
        });
      }
    );
  };

  // 방 나가기
  const leaveRoom = async () => {
    socket.emit("leave-room", { roomId: roomIdRef.current, peerId: socketId }, async (res) => {
      if (res?.error) return console.error("leave error", res.error);
      setJoined(false);
      setPeers([]);
      setPeerNicknames({});
      localStream?.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
      await sendTransport?.close();
      await recvTransport?.close();
      setSendTransport(null);
      setRecvTransport(null);
      socket.off("new-producer", handleNewProducer);
      clearRemoteMedia();
      consumedProducerIds.current.clear();
      setAudioPlaybackBlocked(false);
      audioElementsRef.current = [];
      setChatMessages([]);
      setSubtitles([]);
      setLiveSubtitle("");
      setSlides([]);
      setSlidesOpen(true);
      setRoomId("");
      setNickname("");
      setIsPresenter(false);
      setSlideDrawings({});
    });
  };

  // 미디어 소비(consume)
  const consume = async ({ producerId, kind, type }) => {
    const device = deviceRef.current;
    const transport = recvTransportRef.current;
    if (!device || !transport) return setTimeout(() => consume({ producerId, kind, type }), 500);
    socket.emit(
      "consume",
      { transportId: transport.id, producerId, roomId: roomIdRef.current, peerId: socketId, rtpCapabilities: device.rtpCapabilities },
      async (res) => {
        if (res.error) return console.error("consume error:", res.error);
        const consumer = await transport.consume({
          id: res.consumerData.id,
          producerId: res.consumerData.producerId,
          kind: res.consumerData.kind,
          rtpParameters: res.consumerData.rtpParameters,
        });
        await consumer.resume();
        const stream = new MediaStream();
        stream.addTrack(consumer.track);
        const container = document.getElementById("remote-media");
        if (!container) return;
        if (kind === "video" && type === "screen") {
          let el = document.getElementById("screen-share");
          if (!el) {
            el = document.createElement("video");
            el.id = "screen-share";
            el.autoplay = true;
            el.playsInline = true;
            el.style.width = "640px";
            el.style.border = "2px solid #007bff";
            document.body.appendChild(el);
          }
          el.srcObject = stream;
          el.onloadedmetadata = () => el.play();
        } else if (kind === "video") {
          const el = document.createElement("video");
          el.srcObject = stream;
          el.autoplay = true;
          el.playsInline = true;
          el.width = 200;
          container.appendChild(el);
        } else {
          const el = document.createElement("audio");
          el.srcObject = stream;
          el.autoplay = true;
          el.controls = true;
          el.volume = 1.0;
          container.appendChild(el);
          el.play().catch(() => {
            setAudioPlaybackBlocked(true);
            audioElementsRef.current.push(el);
            alert("브라우저 정책상 오디오 자동 재생이 차단되었습니다. 버튼을 눌러 수동 재생해주세요.");
          });
        }
      }
    );
  };

  // 중복 소비 방지
  const safeConsume = async (p) => {
    if (consumedProducerIds.current.has(p.producerId)) return;
    await consume({ producerId: p.producerId, kind: p.kind, type: p.type });
    consumedProducerIds.current.add(p.producerId);
  };

  // new-producer 이벤트 핸들러
  const handleNewProducer = async (data) => {
    if (!data.kind) return;
    await safeConsume(data);
  };

  // 채팅
  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    socket.emit("send-chat-message", { roomId: roomIdRef.current, peerId: socketId, nickname: nicknameRef.current, message: chatInput, });
    setChatInput("");
  };

  // 오디오 수동 재생
  const tryPlayAudio = () => {
    audioElementsRef.current.forEach((el) => el.play().catch(console.warn));
    setAudioPlaybackBlocked(false);
    audioElementsRef.current = [];
  };

  // 원격 미디어 초기화
  const clearRemoteMedia = () => {
    const container = document.getElementById("remote-media");
    if (container) container.innerHTML = "";
    const screenEl = document.getElementById("screen-share");
    if (screenEl) screenEl.remove();
  };

  // 오디오 통계
  useEffect(() => {
    let interval;
    if (audioProducer && sendTransport?.handler?._pc) {
      const pc = sendTransport.handler._pc;
      const audioSender = pc.getSenders().find((s) => s.track && s.track.kind === "audio");
      if (audioSender) {
        interval = setInterval(() => {
          audioSender.getStats().then((stats) => {
            stats.forEach((report) => {
              if (report.type === "outbound-rtp" && report.kind === "audio") {
                setAudioStats((s) => ({
                  ...s,
                  packetsSent: report.packetsSent,
                  bytesSent: report.bytesSent,
                }));
              }
              if (
                report.type === "media-source" &&
                report.kind === "audio" &&
                report.audioLevel !== undefined
              ) {
                setAudioStats((s) => ({
                  ...s,
                  audioLevel: report.audioLevel,
                }));
              }
            });
          });
        }, 1000);
      }
    }
    return () => clearInterval(interval);
  }, [audioProducer, sendTransport]);

  // 마이크 상태 변경 (emit 추가)
  const handleMicToggle = () => {
    setMicOn((prev) => {
      const next = !prev;
      if (socket && roomIdRef.current && socketId) {
        socket.emit("change-media-state", { roomId: roomIdRef.current, peerId: socketId, micOn: next, screenOn, });
      }
      return next;
    });
  };

  // 화면 공유 상태 변경 (emit 추가)
  const handleScreenToggle = () => {
    setScreenOn((prev) => {
      const next = !prev;
      if (socket && roomIdRef.current && socketId) {
        socket.emit("change-media-state", { roomId: roomIdRef.current, peerId: socketId, micOn, screenOn: next, });
      }
      return next;
    });
  };

  // 슬라이드 넘기기/닫기 (이동 전 저장)
  const nextSlide = () => {
    if (currentSlideRef.current < slides.length - 1) {
      saveCurrentSlideDrawing();
      const next = currentSlideRef.current + 1;
      setCurrentSlide(next);
      socket.emit("update-slide", { roomId: roomIdRef.current, index: next });
    }
  };

  const prevSlide = () => {
    if (currentSlideRef.current > 0) {
      saveCurrentSlideDrawing();
      const prev = currentSlideRef.current - 1;
      setCurrentSlide(prev);
      socket.emit("update-slide", { roomId: roomIdRef.current, index: prev });
    }
  };

  // 슬라이드 업로드
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("roomId", roomIdRef.current);
    const res = await fetch(`${SERVER_URL}/upload`, { method: "POST", body: formData, });
    const data = await res.json();
    setSlides(data.slides);
    setCurrentSlide(0);
    setSlidesOpen(true);
    socket.emit("update-slide", { roomId: roomIdRef.current, index: 0 });
    setPresenterId(socketId);
    setPresenterNickname(nicknameRef.current);
    socket.emit("change-presenter", { roomId: roomIdRef.current, presenterId: socketId, presenterNickname: nicknameRef.current, });
  };

  // 슬라이드 닫기
const closeSlides = () => {
  // 1. Fabric.js 캔버스 인스턴스가 존재하면 수동으로 먼저 정리(dispose)합니다.
  if (fabricCanvasRef.current) {
    fabricCanvasRef.current.dispose();
    fabricCanvasRef.current = null; // 참조를 깨끗하게 비웁니다.
  }

  // 2. 라이브러리 리소스 정리가 끝난 후, React 상태를 업데이트하여 UI를 제거합니다.
  setSlides([]);
  setCurrentSlide(0);
  setSlidesOpen(false);
  
  // 3. 다른 참가자들에게 슬라이드 닫기를 알립니다.
  if (socket && roomIdRef.current) {
    socket.emit("slide-close", { roomId: roomIdRef.current });
  }
};

  // 렌더링
  return (
    <div className={`home-screen ${theme}`}>
      {!joined ? (
        <JoinRoomUI
          nickname={nickname}
          setNickname={setNickname}
          isPresenter={isPresenter}
          setIsPresenter={setIsPresenter}
          roomId={roomId}
          setRoomId={setRoomId}
          handleJoinRoom={handleJoinRoom}
        />
      ) : (
        <>
          <MeetingRoomUI
            roomId={roomId}
            nickname={nickname}
            isPresenter={isPresenter}
            presenterId={presenterId}
            presenterNickname={presenterNickname}
            slides={slides}
            setSlides={setSlides}
            currentSlide={currentSlide}
            setCurrentSlide={setCurrentSlide}
            slidesOpen={slidesOpen}
            setSlidesOpen={setSlidesOpen}
            canvasRef={canvasRef}
            isDrawingMode={isDrawingMode}
            setIsDrawingMode={setIsDrawingMode}
            isAddingText={isAddingText}
            setIsAddingText={setIsAddingText}
            micOn={micOn}
            setMicOn={setMicOn}
            camOn={camOn}
            setCamOn={setCamOn}
            screenOn={screenOn}
            setScreenOn={setScreenOn}
            tab={tab}
            setTab={setTab}
            peers={peers}
            peerNicknames={peerNicknames}
            localStream={localStream}
            localVideoRef={localVideoRef}
            audioProducer={audioProducer}
            videoProducer={videoProducer}
            screenProducer={screenProducer}
            sendTransport={sendTransport}
            recvTransport={recvTransport}
            leaveRoom={leaveRoom}
            sendChatMessage={sendChatMessage}
            chatMessages={chatMessages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            subtitles={subtitles}
            liveSubtitle={liveSubtitle}
            peerMicOn={peerMicOn}
            peerScreenOn={peerScreenOn}
            onMutePeer={onMutePeer}
            audioStats={audioStats}
            startCamera={() => {}}
            stopCamera={() => {}}
            startScreenShare={() => {}}
            stopScreenShare={() => {}}
            handleMicToggle={handleMicToggle}
            handleScreenToggle={handleScreenToggle}
            handleFileUpload={handleFileUpload}
            closeSlides={closeSlides}
            nextSlide={nextSlide}
            prevSlide={prevSlide}
            tryPlayAudio={tryPlayAudio}
            audioPlaybackBlocked={audioPlaybackBlocked}
          />
        </>
      )}
    </div>
  );
}

export default Hwasang;
