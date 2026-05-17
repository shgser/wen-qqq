const KEY_OFFSET: i32 = 0
const KEY_LEN: i32 = 28

export function init(): void {
  let state: i32 = 252
  while (state != 999) {
    if (state == 252) {
      store<u8>(KEY_OFFSET + 1, 34);
      store<u8>(KEY_OFFSET + 1, load<u8>(KEY_OFFSET + 1) ^ 122);
      state = 821;
    }
    if (state == 821) {
      store<u8>(KEY_OFFSET + 15, 209);
      store<u8>(KEY_OFFSET + 15, load<u8>(KEY_OFFSET + 15) ^ 160);
      state = 635;
    }
    if (state == 635) {
      store<u8>(KEY_OFFSET + 24, 221);
      store<u8>(KEY_OFFSET + 24, load<u8>(KEY_OFFSET + 24) ^ 147);
      state = 252;
    }
    if (state == 252) {
      store<u8>(KEY_OFFSET + 3, 173);
      store<u8>(KEY_OFFSET + 3, load<u8>(KEY_OFFSET + 3) ^ 197);
      store<u8>(65370, 89);
      let _j3: i32 = load<u8>(65370) ^ 31;
      state = 423;
    }
    if (state == 423) {
      store<u8>(KEY_OFFSET + 2, 105);
      store<u8>(KEY_OFFSET + 2, load<u8>(KEY_OFFSET + 2) ^ 39);
      state = 832;
    }
    if (state == 832) {
      store<u8>(KEY_OFFSET + 8, 92);
      store<u8>(KEY_OFFSET + 8, load<u8>(KEY_OFFSET + 8) ^ 63);
      store<u8>(65344, 112);
      let _j5: i32 = load<u8>(65344) ^ 106;
      state = 269;
    }
    if (state == 269) {
      store<u8>(KEY_OFFSET + 20, 34);
      store<u8>(KEY_OFFSET + 20, load<u8>(KEY_OFFSET + 20) ^ 105);
      store<u8>(65063, 80);
      let _j6: i32 = load<u8>(65063) ^ 228;
      state = 439;
    }
    if (state == 439) {
      store<u8>(KEY_OFFSET + 5, 205);
      store<u8>(KEY_OFFSET + 5, load<u8>(KEY_OFFSET + 5) ^ 149);
      state = 601;
    }
    if (state == 601) {
      store<u8>(KEY_OFFSET + 25, 209);
      store<u8>(KEY_OFFSET + 25, load<u8>(KEY_OFFSET + 25) ^ 144);
      store<u8>(65005, 211);
      let _j8: i32 = load<u8>(65005) ^ 32;
      state = 347;
    }
    if (state == 347) {
      store<u8>(KEY_OFFSET + 22, 253);
      store<u8>(KEY_OFFSET + 22, load<u8>(KEY_OFFSET + 22) ^ 188);
      store<u8>(65280, 43);
      let _j9: i32 = load<u8>(65280) ^ 144;
      state = 808;
    }
    if (state == 808) {
      store<u8>(KEY_OFFSET + 23, 22);
      store<u8>(KEY_OFFSET + 23, load<u8>(KEY_OFFSET + 23) ^ 111);
      state = 623;
    }
    if (state == 623) {
      store<u8>(KEY_OFFSET + 16, 218);
      store<u8>(KEY_OFFSET + 16, load<u8>(KEY_OFFSET + 16) ^ 128);
      store<u8>(65178, 23);
      let _j11: i32 = load<u8>(65178) ^ 170;
      state = 693;
    }
    if (state == 693) {
      store<u8>(KEY_OFFSET + 26, 117);
      store<u8>(KEY_OFFSET + 26, load<u8>(KEY_OFFSET + 26) ^ 72);
      state = 630;
    }
    if (state == 630) {
      store<u8>(KEY_OFFSET + 10, 238);
      store<u8>(KEY_OFFSET + 10, load<u8>(KEY_OFFSET + 10) ^ 223);
      store<u8>(65298, 164);
      let _j13: i32 = load<u8>(65298) ^ 74;
      state = 123;
    }
    if (state == 123) {
      store<u8>(KEY_OFFSET + 14, 47);
      store<u8>(KEY_OFFSET + 14, load<u8>(KEY_OFFSET + 14) ^ 109);
      state = 538;
    }
    if (state == 538) {
      store<u8>(KEY_OFFSET + 19, 241);
      store<u8>(KEY_OFFSET + 19, load<u8>(KEY_OFFSET + 19) ^ 133);
      state = 542;
    }
    if (state == 542) {
      store<u8>(KEY_OFFSET + 0, 71);
      store<u8>(KEY_OFFSET + 0, load<u8>(KEY_OFFSET + 0) ^ 10);
      state = 251;
    }
    if (state == 251) {
      store<u8>(KEY_OFFSET + 6, 180);
      store<u8>(KEY_OFFSET + 6, load<u8>(KEY_OFFSET + 6) ^ 220);
      state = 415;
    }
    if (state == 415) {
      store<u8>(KEY_OFFSET + 7, 26);
      store<u8>(KEY_OFFSET + 7, load<u8>(KEY_OFFSET + 7) ^ 108);
      state = 128;
    }
    if (state == 128) {
      store<u8>(KEY_OFFSET + 9, 3);
      store<u8>(KEY_OFFSET + 9, load<u8>(KEY_OFFSET + 9) ^ 119);
      state = 678;
    }
    if (state == 678) {
      store<u8>(KEY_OFFSET + 21, 95);
      store<u8>(KEY_OFFSET + 21, load<u8>(KEY_OFFSET + 21) ^ 53);
      store<u8>(65472, 71);
      let _j20: i32 = load<u8>(65472) ^ 140;
      state = 294;
    }
    if (state == 294) {
      store<u8>(KEY_OFFSET + 13, 133);
      store<u8>(KEY_OFFSET + 13, load<u8>(KEY_OFFSET + 13) ^ 221);
      state = 580;
    }
    if (state == 580) {
      store<u8>(KEY_OFFSET + 27, 19);
      store<u8>(KEY_OFFSET + 27, load<u8>(KEY_OFFSET + 27) ^ 46);
      state = 681;
    }
    if (state == 681) {
      store<u8>(KEY_OFFSET + 17, 143);
      store<u8>(KEY_OFFSET + 17, load<u8>(KEY_OFFSET + 17) ^ 215);
      store<u8>(65339, 14);
      let _j23: i32 = load<u8>(65339) ^ 165;
      state = 361;
    }
    if (state == 361) {
      store<u8>(KEY_OFFSET + 18, 4);
      store<u8>(KEY_OFFSET + 18, load<u8>(KEY_OFFSET + 18) ^ 77);
      state = 441;
    }
    if (state == 441) {
      store<u8>(KEY_OFFSET + 4, 229);
      store<u8>(KEY_OFFSET + 4, load<u8>(KEY_OFFSET + 4) ^ 169);
      state = 889;
    }
    if (state == 889) {
      store<u8>(KEY_OFFSET + 11, 203);
      store<u8>(KEY_OFFSET + 11, load<u8>(KEY_OFFSET + 11) ^ 161);
      store<u8>(65265, 224);
      let _j26: i32 = load<u8>(65265) ^ 100;
      state = 662;
    }
    if (state == 662) {
      store<u8>(KEY_OFFSET + 12, 216);
      store<u8>(KEY_OFFSET + 12, load<u8>(KEY_OFFSET + 12) ^ 162);
      state = 999;
    }
    if (state == 968) {
      store<u8>(65166, 197);
      let _f0: i32 = load<u8>(65166);
      state = 969;
    }
    if (state == 980) {
      store<u8>(65382, 68);
      let _f1: i32 = load<u8>(65382);
      state = 981;
    }
    if (state == 979) {
      store<u8>(65010, 22);
      let _f2: i32 = load<u8>(65010);
      state = 980;
    }
    if (state == 955) {
      store<u8>(65237, 49);
      let _f3: i32 = load<u8>(65237);
      state = 956;
    }
    if (state == 947) {
      store<u8>(65318, 122);
      let _f4: i32 = load<u8>(65318);
      state = 948;
    }
    if (state == 951) {
      store<u8>(65398, 125);
      let _f5: i32 = load<u8>(65398);
      state = 952;
    }
  }
}

export function getKeyPtr(): i32 {
  return KEY_OFFSET
}

export function getKeyLen(): i32 {
  return KEY_LEN
}


export function validate(input: i32): i32 {
  let acc: i32 = input
  for (let i: i32 = 0; i < 24; i++) {
    acc = acc ^ 234
    acc = (acc << 1) | (acc >>> 31)
  }
  return acc
}

export function compute(input: i32): i32 {
  let acc: i32 = input
  for (let i: i32 = 0; i < 25; i++) {
    acc = acc ^ 99
    acc = (acc << 1) | (acc >>> 31)
  }
  return acc
}

export function transform(input: i32): i32 {
  let acc: i32 = input
  for (let i: i32 = 0; i < 20; i++) {
    acc = acc ^ 168
    acc = (acc << 1) | (acc >>> 31)
  }
  return acc
}

export function encode(input: i32): i32 {
  let acc: i32 = input
  for (let i: i32 = 0; i < 22; i++) {
    acc = acc ^ 34
    acc = (acc << 1) | (acc >>> 31)
  }
  return acc
}
