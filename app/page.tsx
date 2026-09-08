"use client";

import { useState } from "react";
import StatusBar from "@/app/components/StatusBar";
import IgPanel from "@/app/components/IgPanel";
import ReelsPanel from "@/app/components/ReelsPanel";

type Channel = "ig" | "reels";

export default function Home() {
  const [channel, setChannel] = useState<Channel>("ig");

  return (
    <div className="container">
      <h1>SNS 자동 포스팅</h1>
      <StatusBar />

      <div className="tabs">
        <button className={`tab ${channel === "ig" ? "active" : ""}`} onClick={() => setChannel("ig")}>
          인스타그램 게시물
        </button>
        <button className={`tab ${channel === "reels" ? "active" : ""}`} onClick={() => setChannel("reels")}>
          인스타그램 릴스 (해외 콘텐츠 각색)
        </button>
      </div>

      {channel === "ig" ? <IgPanel /> : <ReelsPanel />}
    </div>
  );
}
