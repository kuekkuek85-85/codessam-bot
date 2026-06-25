#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// .sb3 → 미션 의사코드 변환 스크립트 (PRD §7)
//
// 사용법:
//   node scripts/parse-sb3.mjs <폴더 또는 .sb3파일들...> > missions.json
//
// 동작:
//   1) .sb3(zip)에서 project.json 추출 (시스템 `unzip` 사용)
//   2) 블록 구조를 사람이 읽는 한국어 의사코드로 변환
//   3) Firestore 미션 문서 형태의 JSON 배열을 stdout으로 출력
//
// 출력 JSON을 검토·보완(정답/버그포인트는 사람이 채움) 후,
// Firebase 콘솔이나 admin SDK로 missions 컬렉션에 업로드하세요.
// ─────────────────────────────────────────────────────────────

import { execFileSync } from "node:child_process";
import { readdirSync, statSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename, extname } from "node:path";

// 자주 쓰는 Scratch opcode → 한국어 템플릿. {INPUT}는 입력값 자리.
const OPCODES = {
  event_whenflagclicked: "초록깃발 클릭 했을 때",
  event_whenkeypressed: "{KEY_OPTION} 키를 눌렀을 때",
  event_whenthisspriteclicked: "이 스프라이트를 클릭했을 때",
  control_wait: "{DURATION} 초 기다리기",
  control_repeat: "{TIMES} 번 반복하기",
  control_forever: "무한 반복하기",
  control_if: "만약 {CONDITION} (이)라면",
  control_if_else: "만약 {CONDITION} (이)라면 / 아니면",
  control_repeat_until: "{CONDITION} 까지 반복하기",
  motion_movesteps: "{STEPS} 만큼 움직이기",
  motion_turnright: "시계방향으로 {DEGREES} 도 돌기",
  motion_turnleft: "반시계방향으로 {DEGREES} 도 돌기",
  motion_pointindirection: "{DIRECTION} 도 방향 보기",
  motion_gotoxy: "x:{X} y:{Y} 로 이동하기",
  motion_changeyby: "y 좌표를 {DY} 만큼 바꾸기",
  motion_sety: "y 좌표를 {Y} 로 정하기",
  motion_ifonedgebounce: "벽에 닿으면 튕기기",
  looks_say: "{MESSAGE} 말하기",
  looks_sayforsecs: "{MESSAGE} 을(를) {SECS} 초 동안 말하기",
  sound_play: "소리 재생하기",
  sound_playuntildone: "끝까지 소리 재생하기",
  data_setvariableto: "{VARIABLE} 를 {VALUE} 로 정하기",
  data_changevariableby: "{VARIABLE} 를 {VALUE} 만큼 바꾸기",
  sensing_askandwait: "{QUESTION} 묻고 기다리기",
  sensing_touchingobject: "{TOUCHINGOBJECTMENU} 에 닿았는가",
};

function inputText(blocks, input) {
  // input: [shadowType, valueOrBlockId, ...]
  if (!input) return "[ ]";
  const v = input[1];
  if (Array.isArray(v)) {
    // [type, value] 형태의 리터럴/변수
    return String(v[1] ?? "[ ]");
  }
  if (typeof v === "string" && blocks[v]) {
    return "(" + renderBlock(blocks, v).trim() + ")";
  }
  return "[ ]";
}

function fieldText(block, name) {
  return block.fields?.[name]?.[0] ?? "[ ]";
}

function renderBlock(blocks, id, depth = 0) {
  const block = blocks[id];
  if (!block) return "";
  let tmpl = OPCODES[block.opcode] || `(${block.opcode})`;

  // {NAME} 치환: fields 우선, 없으면 inputs
  tmpl = tmpl.replace(/\{(\w+)\}/g, (_, key) => {
    if (block.fields?.[key]) return fieldText(block, key);
    if (block.inputs?.[key]) return inputText(blocks, block.inputs[key]);
    return "[ ]";
  });

  const indent = "  ".repeat(depth);
  let out = indent + tmpl + "\n";

  // 감싸는 블록(SUBSTACK)
  for (const sub of ["SUBSTACK", "SUBSTACK2"]) {
    const inp = block.inputs?.[sub];
    if (inp && typeof inp[1] === "string") {
      out += renderBlock(blocks, inp[1], depth + 1);
    }
  }

  // 다음 블록(같은 깊이)
  if (block.next) out += renderBlock(blocks, block.next, depth);
  return out;
}

function projectToPseudocode(project) {
  const lines = [];
  for (const target of project.targets || []) {
    const blocks = target.blocks || {};
    // 최상위(hat) 블록부터 렌더
    for (const [id, b] of Object.entries(blocks)) {
      if (b.topLevel && b.opcode?.startsWith("event_")) {
        lines.push(renderBlock(blocks, id).trimEnd());
        lines.push("");
      }
    }
  }
  return lines.join("\n").trim();
}

function extractProjectJson(sb3Path) {
  const dir = mkdtempSync(join(tmpdir(), "sb3-"));
  try {
    execFileSync("unzip", ["-o", "-q", sb3Path, "project.json", "-d", dir]);
    return JSON.parse(readFileSync(join(dir, "project.json"), "utf8"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function collectFiles(args) {
  const files = [];
  for (const a of args) {
    const st = statSync(a);
    if (st.isDirectory()) {
      for (const f of readdirSync(a)) {
        if (extname(f).toLowerCase() === ".sb3") files.push(join(a, f));
      }
    } else if (extname(a).toLowerCase() === ".sb3") {
      files.push(a);
    }
  }
  return files;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      "사용법: node scripts/parse-sb3.mjs <폴더|.sb3...> > missions.json"
    );
    process.exit(1);
  }
  const files = collectFiles(args);
  const missions = files.map((file) => {
    const project = extractProjectJson(file);
    const skeletonText = projectToPseudocode(project);
    const name = basename(file, ".sb3");
    return {
      // 사람이 보완할 칸은 빈 값/추정값으로 — 검토 후 채우세요.
      id: name.replace(/\s+/g, "-").toLowerCase(),
      sessionId: "demo-session",
      level: "중", // ← 검토 후 상/중/하 지정
      set: "1차시",
      title: name,
      skeletonText,
      answerText: "", // ← 정답 .sb3로 별도 변환해 채우기
      bugPoints: [], // ← 버그 위치·핵심 개념 직접 입력
      conceptTags: [],
      sb3Url: "", // ← 스토리지 업로드 후 링크
      goalDescription: "",
      videoUrl: "",
    };
  });
  process.stdout.write(JSON.stringify(missions, null, 2) + "\n");
  console.error(`✓ ${missions.length}개 미션 변환 완료. JSON을 검토·보완하세요.`);
}

main();
