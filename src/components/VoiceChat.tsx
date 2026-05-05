"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface VoiceChatProps {
  candidateName: string;
  candidateEmail: string;
  candidatePageId: string;
  onComplete: () => void;
}

// Only show quick replies for assessment-level setup/confirmation prompts — NOT for
// in-scenario questions like "can you provide the account holder's name?"
function isQuickReplyQuestion(text: string): boolean {
  const lower = text.toLowerCase();
  if (/ready to begin|ready to start|shall we (begin|start|proceed)|are you ready/i.test(lower)) return true;
  // Scenario setup messages that end with "when you're ready" or "whenever you're ready"
  if (/when you'?re ready|just say so|whenever you'?re ready/i.test(lower)) return true;
  // (No scenario transitions — single scenario assessment)
  return false;
}

export default function VoiceChat({
  candidateName,
  candidateEmail,
  candidatePageId,
  onComplete,
}: VoiceChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesRef = useRef<Message[]>([]);

  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Timer
  useEffect(() => {
    if (isStarted) {
      timerRef.current = setInterval(() => {
        setElapsedTime((t) => t + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStarted]);

  // Initialize speech
  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const skipSpeech = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        if (!synthRef.current) {
          resolve();
          return;
        }
        synthRef.current.cancel();
        setIsSpeaking(true);

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const voices = synthRef.current.getVoices();
        const preferred = voices.find(
          (v) =>
            v.name.includes("Samantha") ||
            v.name.includes("Karen") ||
            v.name.includes("Google US English") ||
            (v.lang === "en-US" && v.localService)
        );
        if (preferred) utterance.voice = preferred;

        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };
        synthRef.current.speak(utterance);
      });
    },
    []
  );

  const handleAIResponse = useCallback(
    async (aiResponse: string, currentMessages: Message[]) => {
      if (!aiResponse) return;

      // If the AI accidentally included scoring JSON, strip it before showing
      let displayText = aiResponse;
      const jsonStart = aiResponse.indexOf('{"overall_score"');
      if (jsonStart !== -1) {
        displayText = aiResponse.substring(0, jsonStart).trim();
      }

      // Primary detection: the [ASSESSMENT_COMPLETE] marker
      const hasMarker = aiResponse.includes("[ASSESSMENT_COMPLETE]");
      if (hasMarker) {
        displayText = displayText.replace(/\[ASSESSMENT_COMPLETE\]/g, "").trim();
      }

      // Fallback detection: broad phrase matching
      const lower = aiResponse.toLowerCase();
      const hasFallbackPhrases =
        lower.includes("recruiting team will review") ||
        lower.includes("be in touch with you shortly") ||
        lower.includes("wraps up the skills assessment") ||
        lower.includes("wraps up the assessment") ||
        lower.includes("concludes the assessment") ||
        lower.includes("end of the second scenario") ||
        lower.includes("thanks so much for your time") ||
        lower.includes("thank you so much for your time") ||
        lower.includes("have a great day");

      const isClosing = hasMarker || hasFallbackPhrases;

      if (isClosing) {
        // Immediately show the completion screen — no more chat interaction
        setIsCompleted(true);
        if (synthRef.current) synthRef.current.cancel();
        setIsSpeaking(false);
        setShowQuickReplies(false);

        // Build the full transcript (include the AI's final message)
        const allMessages = displayText
          ? [...currentMessages, { role: "assistant" as const, content: displayText }]
          : currentMessages;

        // Save to Notion in the background, then redirect
        const scoringMessages: Message[] = [
          ...allMessages,
          { role: "user", content: "END_ASSESSMENT_GENERATE_SCORES" },
        ];

        try {
          const scoringResult = await sendToAI(scoringMessages);
          if (scoringResult) {
            await fetch("/api/submit-results", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                candidatePageId,
                candidateName,
                candidateEmail,
                transcript: allMessages,
                scoringResponse: scoringResult,
              }),
            });
          }
        } catch (err) {
          console.error("[VoiceChat] Scoring/submission error:", err);
          await fetch("/api/submit-results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              candidatePageId,
              candidateName,
              candidateEmail,
              transcript: allMessages,
              scoringResponse: null,
            }),
          });
        }

        // Let them see the thank-you screen for a bit, then redirect
        setTimeout(() => onComplete(), 6000);
        return;
      }

      // Not a closing message — show it normally
      if (displayText) {
        const aiMessage: Message = { role: "assistant", content: displayText };
        const withAi = [...currentMessages, aiMessage];
        setMessages(withAi);
        await speak(displayText);
      }

      // Check if we should show quick reply buttons
      if (isQuickReplyQuestion(aiResponse)) {
        setShowQuickReplies(true);
      } else {
        setShowQuickReplies(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [speak, onComplete, candidatePageId, candidateName, candidateEmail]
  );

  const sendToAI = useCallback(
    async (currentMessages: Message[]): Promise<string> => {
      setIsProcessing(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: currentMessages }),
        });
        const data = await res.json();

        if (data.isScoring) {
          // Show completion screen immediately
          setIsCompleted(true);
          if (synthRef.current) synthRef.current.cancel();
          setIsSpeaking(false);
          setShowQuickReplies(false);

          await fetch("/api/submit-results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              candidatePageId,
              candidateName,
              candidateEmail,
              transcript: currentMessages,
              scoringResponse: data.content,
            }),
          });

          setTimeout(() => onComplete(), 6000);
          return "";
        }

        return data.content;
      } catch {
        setError("Connection issue. Please try again.");
        return "";
      } finally {
        setIsProcessing(false);
      }
    },
    [candidateName, candidateEmail, candidatePageId]
  );

  // Send a text message (used by quick replies and typed input)
  const sendTextMessage = useCallback(
    async (text: string) => {
      setShowQuickReplies(false);
      const userMessage: Message = { role: "user", content: text };
      const updatedMessages = [...messagesRef.current, userMessage];
      setMessages(updatedMessages);

      const aiResponse = await sendToAI(updatedMessages);
      await handleAIResponse(aiResponse, updatedMessages);
    },
    [sendToAI, handleAIResponse]
  );

  const toggleListening = useCallback(() => {
    if (isListening) {
      // Stop listening and send
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsListening(false);

      const userText = transcript.trim();
      if (!userText) return;

      setShowQuickReplies(false);
      const userMessage: Message = { role: "user", content: userText };
      const updatedMessages = [...messagesRef.current, userMessage];
      setMessages(updatedMessages);
      setTranscript("");

      (async () => {
        const aiResponse = await sendToAI(updatedMessages);
        await handleAIResponse(aiResponse, updatedMessages);
      })();
    } else {
      // Start listening
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setError(
          "Speech recognition is not supported in this browser. Please use Chrome."
        );
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let finalTranscript = "";

      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setTranscript(finalTranscript + interim);
      };

      recognition.onerror = (event: any) => {
        if (event.error !== "aborted") {
          console.error("Speech recognition error:", event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      setTranscript("");
    }
  }, [isListening, transcript, sendToAI, handleAIResponse]);

  const startAssessment = useCallback(async () => {
    setIsStarted(true);

    const initialMessages: Message[] = [
      {
        role: "user",
        content: `Hi, my name is ${candidateName}. I'm ready to begin the assessment.`,
      },
    ];
    setMessages(initialMessages);

    const aiResponse = await sendToAI(initialMessages);
    if (aiResponse) {
      const aiMessage: Message = { role: "assistant", content: aiResponse };
      const withAi = [...initialMessages, aiMessage];
      setMessages(withAi);

      await speak(aiResponse);

      // The welcome message asks "Ready to begin?" — show quick replies
      if (isQuickReplyQuestion(aiResponse)) {
        setShowQuickReplies(true);
      }
    }
  }, [candidateName, sendToAI, speak]);

  const isIdle = isStarted && !isListening && !isSpeaking && !isProcessing;

  // Completion screen — replaces entire chat UI
  if (isCompleted) {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] max-w-3xl mx-auto items-center justify-center bg-white rounded-[10px] border border-mf-navy/10 shadow-sm">
        <div className="text-center px-10">
          <div className="w-20 h-20 bg-mf-green/15 rounded-full flex items-center justify-center mx-auto mb-8">
            <svg
              className="w-10 h-10 text-mf-green"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-mf-navy mb-4">
            Thank you so much for participating!
          </h2>
          <p className="text-foreground/70 text-lg mb-3">
            Your assessment is complete. The recruiting team will review your results and be in touch with you shortly.
          </p>
          <p className="text-foreground/70 text-lg mb-8">
            Have a wonderful day!
          </p>
          <div className="inline-flex items-center gap-2 text-foreground/40 text-sm">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Saving your results...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-3xl mx-auto">
      {/* Timer bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-mf-navy rounded-t-[10px]">
        <span className="text-sm text-white/70">
          {isStarted ? "Assessment in progress" : "Ready to begin"}
        </span>
        <span className="text-sm font-mono text-white/70">
          {formatTime(elapsedTime)}
        </span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-white border-x border-mf-navy/10 space-y-4">
        {!isStarted && (
          <div className="flex items-center justify-center h-full">
            <button
              onClick={startAssessment}
              className="px-8 py-4 bg-mf-green text-white rounded-[10px] font-bold text-lg
                hover:bg-mf-green-light transition-colors"
            >
              Start Assessment
            </button>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-mf-navy text-white"
                  : "bg-mf-warm-bg text-foreground"
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Live transcript preview */}
        {isListening && transcript && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-mf-navy/10 text-foreground/60 border-2 border-dashed border-mf-navy/20">
              <p className="text-sm leading-relaxed italic">{transcript}</p>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-mf-warm-bg rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-mf-green rounded-full animate-bounce" />
                <span
                  className="w-2 h-2 bg-mf-green rounded-full animate-bounce"
                  style={{ animationDelay: "0.15s" }}
                />
                <span
                  className="w-2 h-2 bg-mf-green rounded-full animate-bounce"
                  style={{ animationDelay: "0.3s" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Controls */}
      <div className="p-4 bg-mf-warm-bg rounded-b-[10px] border border-t-0 border-mf-navy/10">
        {error && (
          <p className="text-mf-orange text-sm font-medium mb-2 text-center">{error}</p>
        )}

        {isStarted && (
          <div className="flex flex-col items-center gap-3">
            {/* Quick reply buttons */}
            {isIdle && showQuickReplies && (
              <div className="flex gap-3">
                <button
                  onClick={() => sendTextMessage("Yes, I'm ready.")}
                  className="px-6 py-2.5 bg-mf-green text-white rounded-[10px] font-bold
                    hover:bg-mf-green-light transition-colors"
                >
                  Yes
                </button>
                <button
                  onClick={() => sendTextMessage("No, I have a question first.")}
                  className="px-6 py-2.5 bg-mf-navy/10 text-mf-navy rounded-[10px] font-bold
                    hover:bg-mf-navy/20 transition-colors"
                >
                  No
                </button>
              </div>
            )}

            {/* Voice controls */}
            <div className="flex items-center gap-3">
              {isIdle && (
                <button
                  onClick={toggleListening}
                  className="flex items-center gap-2 px-6 py-3 bg-mf-green text-white rounded-[10px] font-bold
                    hover:bg-mf-green-light transition-colors"
                >
                  <MicIcon />
                  Tap to Speak
                </button>
              )}

              {isListening && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-3 text-mf-orange">
                    <span className="w-2.5 h-2.5 bg-mf-orange rounded-full animate-pulse" />
                    <span className="text-sm font-semibold">Listening...</span>
                  </div>
                  <button
                    onClick={toggleListening}
                    className="flex items-center gap-2 px-6 py-3 bg-mf-navy text-white rounded-[10px] font-bold
                      hover:bg-mf-navy/80 transition-colors"
                  >
                    <SendIcon />
                    Done
                  </button>
                </div>
              )}

              {isSpeaking && (
                <button
                  onClick={skipSpeech}
                  className="flex items-center gap-2 px-6 py-3 bg-mf-navy/10 text-mf-navy rounded-[10px] font-bold
                    hover:bg-mf-navy/20 transition-colors"
                >
                  <SkipIcon />
                  Skip Readout
                </button>
              )}

              {isProcessing && (
                <div className="flex items-center gap-2 px-6 py-3 text-foreground/50">
                  <span className="text-sm font-medium">Thinking...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
      />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061A1.125 1.125 0 013 16.811V8.69zM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061a1.125 1.125 0 01-1.683-.977V8.69z"
      />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
      />
    </svg>
  );
}
