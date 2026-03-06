"use client";

import { useEffect } from "react";

export default function ThemeSwitcher() {

  function setTheme(theme:string){
    document.documentElement.setAttribute("data-theme", theme);
  }

  return (
    <div style={{display:"flex", gap:"10px"}}>
      <button onClick={()=>setTheme("blue")}>Blue</button>
      <button onClick={()=>setTheme("gold")}>Gold</button>
      <button onClick={()=>setTheme("green")}>Green</button>
    </div>
  );
}