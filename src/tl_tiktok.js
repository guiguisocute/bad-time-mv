// TikTok cut (?cut=tiktok): a cold open on the FIGHT select that starts the four-strike combo,
// harder strikes, portrait framing for the shots the 16:9 camera does not fit, and a light layer
// of extra sound (air and reverse swells only - nothing the game itself would not have under it).
MV.sections.push(function () {
  const MV = window.MV, TL = MV.TL, H = MV.H, L = MV.LAYOUT;
  if (!MV.TIKTOK) return;
  const at = H.at, BEAT = H.BEAT;
  const [ex, ey] = L.enemy;
  const frame = (t0, t1, v, ease = 'inOut') => TL.pcam.to(t0, t1, v, ease);

  // ---------------------------------------------------------------- bar 44: cold open
  // straight onto his grin; the reveal comes with the four cursors, the camera creeping in
  const t0 = at(44);
  H.cut(t0, { x: ex, y: ey - 104, zoom: 2.7, roll: -0.05, pitch: 0, yaw: 0.08 });
  H.cam(t0, at(44, 2) - 0.01, { zoom: 3.05, roll: -0.02, yaw: 0.02 }, 'lin');
  TL.glitch(t0, t0 + 0.08, 0.8);
  H.hit(t0, 0.8, { flash: 0.3 });
  H.cut(at(44, 2), { x: 480, y: 286, zoom: 1.08, roll: 0, pitch: 0, yaw: 0 });
  H.cam(at(44, 2), at(45) - 0.01, { zoom: 1.3, y: 282 }, 'in2');
  H.punch(at(44, 2), 0.6);
  frame(at(44, 2), at(44, 2), { k: 0.56 });
  frame(at(45), at(45), { k: 0.62 });
  for (let k = 0; k < 4; k++) H.sfx(at(44, 2) + (k * BEAT) / 2, 'MenuCursor', 0.25);
  // bar 45: the four strikes cut deeper - an impact frame on each
  for (let k = 0; k < 4; k++) TL.impact(at(45, k), { inv: 0.03, bw: 0.03, amp: 6 + k * 2, ca: 6 + k * 2, dur: 0.3 });

  // ---------------------------------------------------------------- bars 46-53
  // (the speech bubble shot is in tl_counter.js; blasters anywhere are kept in shot by
  // H.framePortrait, which opens the view up around them)
  H.sfx(at(47), 'Flash', 0.3); // the eye lights up
  for (let k = 1; k < 8; k++) H.sfx(at(48, k) - 0.15, 'Whoosh', 0.1);

  // ---------------------------------------------------------------- bars 56-63
  // (bars 54-55 frame themselves, tl_frenzy.js.) The shaft is tall and narrow: fill the frame
  // with it, then settle for the 3D hand-off
  const tBreak = at(58) + 0.07;
  frame(at(58), tBreak + 0.35, { k: 0.72 });
  frame(at(59, 3) - 0.1, at(59, 3) - 0.1, { k: 0.62 }); // (as the picture drops into first person)
  H.sfx(tBreak, 'Whoosh', 0.25);
  H.swell(at(59, 3), 0.35, 'SwellShort'); // into the slam through the soul

  // ---------------------------------------------------------------- bars 68-71
  // (16:9 moves him right of the text box; the portrait text sits above his head, so re-centre him)
  frame(at(68, 2), at(68, 3), { dx: 70 });
  frame(at(69), at(70), { dx: 75 });
  frame(at(70, 1) - 0.02, at(70, 1), { dx: 0 }, 'outExpo');

  // ---------------------------------------------------------------- bars 72-77
  H.swell(at(72), 0.45); // into the cut
  // aftermath: the menu text starts at the left edge of the box
  frame(at(73), at(73, 2), { dx: -55 });
  frame(at(76, 3), at(77), { dx: 0 });
});
