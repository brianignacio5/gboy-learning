/*
 * Filename: c:/Users/brian/workspace/gboy-learning/src/web/emulator/cpu.ts
 * Path: c:/Users/brian/workspace/gboy-learning
 * Created Date: Saturday, March 22nd 2025, 11:29:51 am
 * Author: Brian Ignacio
 *
 * Copyright (c) 2025 Your Company
 */

import { Memory } from "./memory";

export class Registers {
  public a: number = 0;
  public b: number = 0;
  c: number = 0;
  d: number = 0;
  e: number = 0;
  /**
   * Flags register based on last operation.
   *
   * Zero( 0x80) Set if last operation is result of 0
   *
   * Operation (0x40) Set if last operation was a substraction
   *
   * Half-carry (0x20) Set if result of last operation , lower half of byte overflowed past 15
   *
   * Carry (x010) Set if the last operation produced a result over 255 (addition) or under 0 (substraction)
   */
  f: number = 0;
  h: number = 0;
  l: number = 0;
  /**
   * Program counter 16-bit register
   */
  pc: number = 0;
  /**
   * Stack pointer 16-bit register
   *
   * Starts at 0xFFFE
   */
  sp: number = 0;
  /**
   * Clocks for last instruction executed
   */
  m: number = 0;
  /**
   * Clocks for last instruction executed
   */
  t: number = 0;

  get af() {
    return (this.a << 8) | this.f;
  }

  get bc() {
    return (this.b << 8) | this.c;
  }

  get de() {
    return (this.d << 8) | this.e;
  }

  get hl() {
    return (this.h << 8) | this.l;
  }

  set af(value: number) {
    this.a = (value >> 8) | 0xff;
    this.f = value & 0xff;
  }

  set bc(value: number) {
    this.b = (value >> 8) | 0xff;
    this.c = value & 0xff;
  }

  set de(value: number) {
    this.d = (value >> 8) | 0xff;
    this.e = value & 0xff;
  }

  set hl(value: number) {
    this.h = (value >> 8) | 0xff;
    this.l = value & 0xff;
  }
}

export interface IClocks {
  m: number;
  t: number;
}

export class CPU {
  private memory = new Memory(1024);
  public registers: Registers = new Registers();

  /**
   * Clocks for the CPU.
   * m: Machine cycles
   * t: T-states
   */
  public clocks: IClocks = {
    m: 0,
    t: 0,
  };
  /**
   * Indicates if the CPU is halted.
   * When halted, the CPU does not execute instructions until an interrupt occurs.
   */
  public halted: boolean;

  /**
   * Indicates if the CPU is stopped.
   * When stopped, the CPU waits for a specific instruction to resume execution.
   */
  public stopped: boolean;

  private instructions: { [opcode: number]: () => void };

  constructor() {
    this.instructions = this.initializeInstructions();
    this.halted = false;
    this.stopped = false;
  }

  private initializeInstructions(): { [opcode: number]: () => void } {
    const instructions: { [opcode: number]: () => void } = {};

    instructions[0x00] = this.nop;
    instructions[0x01] = this.ldBC_d16;
    instructions[0x02] = this.ldBC_A;
    instructions[0x03] = this.incBC;
    instructions[0x04] = this.incB;
    instructions[0x05] = this.decB;
    instructions[0x06] = this.ldB_d8;
    instructions[0x07] = this.rlcA;
    instructions[0x08] = this.ld_a16_SP;
    instructions[0x09] = this.addHLBC;
    instructions[0x0a] = this.ldA_BC;
    instructions[0x0b] = this.decBC;
    instructions[0x0c] = this.incC;
    instructions[0x0d] = this.decC;
    instructions[0x0e] = this.ldC_d8;
    instructions[0x0f] = this.rrcA;

    instructions[0x10] = this.stop;
    instructions[0x11] = this.ldDE_d16;
    instructions[0x12] = this.ldDE_A;
    instructions[0x13] = this.incDE;
    instructions[0x14] = this.incD;
    instructions[0x15] = this.decD;
    instructions[0x16] = this.ldD_d8;
    instructions[0x17] = this.rlA;
    instructions[0x18] = this.jr_r8;
    instructions[0x19] = this.addHLDE;
    instructions[0x1a] = this.ldA_DE;
    instructions[0x1b] = this.decDE;
    instructions[0x1c] = this.incE;
    instructions[0x1d] = this.decE;
    instructions[0x1e] = this.ldE_d8;
    instructions[0x1f] = this.rrA;

    instructions[0x20] = this.jrNZ_r8;
    instructions[0x21] = this.ldHL_d16;
    instructions[0x22] = this.ldHLi_A;
    instructions[0x23] = () => this.incHL(false);
    instructions[0x24] = this.incH;
    instructions[0x25] = this.decH;
    instructions[0x26] = this.ldH_d8;
    instructions[0x27] = this.daa;
    instructions[0x28] = this.jrZ_r8;
    instructions[0x29] = this.addHLHL;
    instructions[0x2a] = this.ldA_HLi;
    instructions[0x2b] = () => this.decHL(false);
    instructions[0x2c] = this.incL;
    instructions[0x2d] = this.decL;
    instructions[0x2e] = this.ldL_d8;
    instructions[0x2f] = this.cpl;

    instructions[0x30] = this.jrNC_r8;
    instructions[0x31] = this.ldSP_d16;
    instructions[0x32] = this.ldHLd_A;
    instructions[0x33] = this.incSP;
    instructions[0x34] = () => this.incHL(true);
    instructions[0x35] = () => this.decHL(true);
    instructions[0x36] = this.ldHL_d8;
    instructions[0x37] = this.scf;
    instructions[0x38] = this.jrC_r8;
    instructions[0x39] = this.addHLSP;
    instructions[0x3a] = this.ldA_HLd;
    instructions[0x3b] = this.decSP;
    instructions[0x3c] = this.incA;
    instructions[0x3d] = this.decA;
    instructions[0x3e] = this.ldA_d8;
    instructions[0x3f] = this.ccf;

    instructions[0x40] = this.ldB_B;
    instructions[0x41] = this.ldB_C;
    instructions[0x42] = this.ldB_D;
    instructions[0x43] = this.ldB_E;
    instructions[0x44] = this.ldB_H;
    instructions[0x45] = this.ldB_L;
    instructions[0x46] = this.ldB_HL;
    instructions[0x47] = this.ldB_A;
    instructions[0x48] = this.ldC_B;
    instructions[0x49] = this.ldC_C;
    instructions[0x4a] = this.ldC_D;
    instructions[0x4b] = this.ldC_E;
    instructions[0x4c] = this.ldC_H;
    instructions[0x4d] = this.ldC_L;
    instructions[0x4e] = this.ldC_HL;
    instructions[0x4f] = this.ldC_A;

    instructions[0x50] = this.ldD_B;
    instructions[0x51] = this.ldD_C;
    instructions[0x52] = this.ldD_D;
    instructions[0x53] = this.ldD_E;
    instructions[0x54] = this.ldD_H;
    instructions[0x55] = this.ldD_L;
    instructions[0x56] = this.ldD_HL;
    instructions[0x57] = this.ldD_A;
    instructions[0x58] = this.ldE_B;
    instructions[0x59] = this.ldE_C;
    instructions[0x5a] = this.ldE_D;
    instructions[0x5b] = this.ldE_E;
    instructions[0x5c] = this.ldE_H;
    instructions[0x5d] = this.ldE_L;
    instructions[0x5e] = this.ldE_HL;
    instructions[0x5f] = this.ldE_A;

    instructions[0x60] = this.ldH_B;
    instructions[0x61] = this.ldH_C;
    instructions[0x62] = this.ldH_D;
    instructions[0x63] = this.ldH_E;
    instructions[0x64] = this.ldH_H;
    instructions[0x65] = this.ldH_L;
    instructions[0x66] = this.ldH_HL;
    instructions[0x67] = this.ldH_A;
    instructions[0x68] = this.ldL_B;
    instructions[0x69] = this.ldL_C;
    instructions[0x6a] = this.ldL_D;
    instructions[0x6b] = this.ldL_E;
    instructions[0x6c] = this.ldL_H;
    instructions[0x6d] = this.ldL_L;
    instructions[0x6e] = this.ldL_HL;
    instructions[0x6f] = this.ldL_A;

    instructions[0x70] = this.ldHL_B;
    instructions[0x71] = this.ldHL_C;
    instructions[0x72] = this.ldHL_D;
    instructions[0x73] = this.ldHL_E;
    instructions[0x74] = this.ldHL_H;
    instructions[0x75] = this.ldHL_L;
    instructions[0x76] = this.halt; // HALT instruction
    instructions[0x77] = this.ldHL_A;
    instructions[0x78] = this.ldA_B;
    instructions[0x79] = this.ldA_C;
    instructions[0x7a] = this.ldA_D;
    instructions[0x7b] = this.ldA_E;
    instructions[0x7c] = this.ldA_H;
    instructions[0x7d] = this.ldA_L;
    instructions[0x7e] = this.ldA_HL;
    instructions[0x7f] = this.ldA_A;

    instructions[0x80] = this.addA_B;
    instructions[0x81] = this.addA_C;
    instructions[0x82] = this.addA_D;
    instructions[0x83] = this.addA_E;
    instructions[0x84] = this.addA_H;
    instructions[0x85] = this.addA_L;
    instructions[0x86] = this.addA_HL;
    instructions[0x87] = this.addA_A;
    instructions[0x88] = this.adcA_B;
    instructions[0x89] = this.adcA_C;
    instructions[0x8a] = this.adcA_D;
    instructions[0x8b] = this.adcA_E;
    instructions[0x8c] = this.adcA_H;
    instructions[0x8d] = this.adcA_L;
    instructions[0x8e] = this.adcA_HL;
    instructions[0x8f] = this.adcA_A;

    instructions[0x90] = this.subA_B;
    instructions[0x91] = this.subA_C;
    instructions[0x92] = this.subA_D;
    instructions[0x93] = this.subA_E;
    instructions[0x94] = this.subA_H;
    instructions[0x95] = this.subA_L;
    instructions[0x96] = this.subA_HL;
    instructions[0x97] = this.subA_A;
    instructions[0x98] = this.sbcA_B;
    instructions[0x99] = this.sbcA_C;
    instructions[0x9a] = this.sbcA_D;
    instructions[0x9b] = this.sbcA_E;
    instructions[0x9c] = this.sbcA_H;
    instructions[0x9d] = this.sbcA_L;
    instructions[0x9e] = this.sbcA_HL;
    instructions[0x9f] = this.sbcA_A;

    instructions[0xa0] = this.andA_B;
    instructions[0xa1] = this.andA_C;
    instructions[0xa2] = this.andA_D;
    instructions[0xa3] = this.andA_E;
    instructions[0xa4] = this.andA_H;
    instructions[0xa5] = this.andA_L;
    instructions[0xa6] = this.andA_HL;
    instructions[0xa7] = this.andA_A;
    instructions[0xa8] = this.xorA_B;
    instructions[0xa9] = this.xorA_C;
    instructions[0xaa] = this.xorA_D;
    instructions[0xab] = this.xorA_E;
    instructions[0xac] = this.xorA_H;
    instructions[0xad] = this.xorA_L;
    instructions[0xae] = this.xorA_HL;
    instructions[0xaf] = this.xorA_A;

    instructions[0xb0] = this.orA_B;
    instructions[0xb1] = this.orA_C;
    instructions[0xb2] = this.orA_D;
    instructions[0xb3] = this.orA_E;
    instructions[0xb4] = this.orA_H;
    instructions[0xb5] = this.orA_L;
    instructions[0xb6] = this.orA_HL;
    instructions[0xb7] = this.orA_A;
    instructions[0xb8] = this.cpA_B;
    instructions[0xb9] = this.cpA_C;
    instructions[0xba] = this.cpA_D;
    instructions[0xbb] = this.cpA_E;
    instructions[0xbc] = this.cpA_H;
    instructions[0xbd] = this.cpA_L;
    instructions[0xbe] = this.cpA_HL;
    instructions[0xbf] = this.cpA_A;

    instructions[0xc0] = this.retNZ;
    instructions[0xc1] = this.popBC;
    instructions[0xc2] = this.jpnz_a16;
    instructions[0xc3] = this.jp_a16;
    instructions[0xc4] = this.callNZ_a16;
    instructions[0xc5] = this.pushBC;
    instructions[0xc6] = this.addA_d8;
    instructions[0xc7] = this.rst00;
    instructions[0xc8] = this.retZ;
    instructions[0xc9] = this.ret;
    instructions[0xca] = this.jpz_a16;
    instructions[0xcb] = this.prefixCB;
    instructions[0xcc] = this.callZ_a16;
    instructions[0xcd] = this.pushAF;
    instructions[0xce] = this.adcA_d8;
    instructions[0xcf] = this.rst08;

    instructions[0xd0] = this.retNC;
    instructions[0xd1] = this.popDE;
    instructions[0xd2] = this.jpnC_a16;
    instructions[0xd3] = this.outC_a8;
    instructions[0xd4] = this.callNC_a16;
    instructions[0xd5] = this.pushDE;
    instructions[0xd6] = this.subA_d8;
    instructions[0xd7] = this.rst10;
    instructions[0xd8] = this.retC;
    instructions[0xd9] = this.reti;
    instructions[0xda] = this.jpC_a16;
    instructions[0xdb] = this.inC_a8;
    instructions[0xdc] = this.callC_a16;
    instructions[0xdd] = this.prefixDD;
    instructions[0xde] = this.sbcA_d8;
    instructions[0xdf] = this.rst18;

    instructions[0xe0] = this.ldH_a8;
    instructions[0xe1] = this.popHL;
    instructions[0xe2] = this.ldC_A;
    instructions[0xe3] = this.ldHLI_SP;
    instructions[0xe4] = this.prefixE4; // Unused
    instructions[0xe5] = this.pushHL;
    instructions[0xe6] = this.andA_d8;
    instructions[0xe7] = this.rst20;
    instructions[0xe8] = this.addSP_r8;
    instructions[0xe9] = this.jpHL;
    instructions[0xea] = this.ld_a16_A;
    instructions[0xeb] = this.ld_A_a16;
    instructions[0xec] = this.prefixEC; // Unused

    instructions[0xed] = this.prefixED; // Unused
    instructions[0xee] = this.xorA_d8;
    instructions[0xef] = this.rst28;

    instructions[0xf0] = this.ldA_a8;
    instructions[0xf1] = this.popAF;
    instructions[0xf2] = this.ldA_C;
    instructions[0xf3] = this.di;
    instructions[0xf4] = this.callZ_a16;
    instructions[0xf5] = this.pushAF;
    instructions[0xf6] = this.orA_d8;
    instructions[0xf7] = this.rst30;
    instructions[0xf8] = this.ldHL_SP_r8;
    instructions[0xf9] = this.ldSP_HL;
    instructions[0xfa] = this.ldA_d16;
    instructions[0xfb] = this.ei;
    instructions[0xfc] = this.call_a16;
    instructions[0xfd] = this.prefixFD;
    instructions[0xfe] = this.cpA_d8;
    instructions[0xff] = this.rst38;

    return instructions;
  }

  /**
   * Interrupt master Enable flag
   */
  public ime: boolean = false;

  public handleInterrupts() {
    if (this.ime) {
      // Handle interrupt
    }
  }

  public enableInterrupts() {
    this.ime = true;
  }

  public disableInterrupts() {
    this.ime = false;
  }

  public executeCycle(): void {
    const opcode = this.fetch();
    const instruction = this.instructions[opcode];
    if (instruction) {
      instruction();
    } else {
      throw new Error(`Unknown opcode ${opcode.toString(16).padStart(2, "0")}`);
    }
  }

  private fetch() {
    const opcodeCode = this.memory.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xfff;
    return opcodeCode;
  }

  private nop() {
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  private ldBC_d16() {
    const value = this.fetchWord();
    this.registers.bc = value;
    this.clocks.m = 3;
    this.clocks.t = 12;
  }

  private ldDE_d16() {
    const value = this.fetchWord();
    this.registers.de = value;
    this.clocks.m = 3;
    this.clocks.t = 12;
  }

  private ldSP_d16() {
    const value = this.fetchWord();
    this.registers.sp = value;
    this.clocks.m = 3;
    this.clocks.t = 12;
  }

  private ldHL_d16() {
    const value = this.fetchWord();
    this.registers.hl = value;
    this.clocks.m = 3;
    this.clocks.t = 12;
  }

  /**
   * Load 8-bit immediate value into A (LD A, d8).
   * Loads the next byte from memory into the A register.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldA_d8() {
    const value = this.fetch(); // Fetch the 8-bit immediate value
    this.registers.a = value; // Load the value into the A register
    this.clocks.m = 2; // 8 clock cycles
    this.clocks.t = 8;
  }

  /**
   * Load 8-bit immediate value into B (LD B, d8).
   * Loads the next byte from memory into the B register.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldB_d8() {
    const value = this.fetch();
    this.registers.b = value;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  /**
   * Load 8-bit immediate value into C (LD C, d8).
   * Loads the next byte from memory into the C register.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldC_d8() {
    const value = this.fetch();
    this.registers.c = value;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  /**
   * Load 8-bit immediate value into D (LD D, d8).
   * Loads the next byte from memory into the D register.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldD_d8() {
    const value = this.fetch();
    this.registers.d = value;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  /**
   * Load 8-bit immediate value into E (LD E, d8).
   * Loads the next byte from memory into the E register.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldE_d8() {
    const value = this.fetch();
    this.registers.e = value;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  /**
   * Load 8-bit immediate value into H (LD H, d8).
   * Loads the next byte from memory into the H register.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldH_d8() {
    const value = this.fetch();
    this.registers.h = value;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  /**
   * Load 8-bit immediate value into L (LD L, d8).
   * Loads the next byte from memory into the L register.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldL_d8() {
    const value = this.fetch();
    this.registers.l = value;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  private ldHL_d8() {
    const value = this.fetch();
    this.memory.writeByte(this.registers.hl, value);
    this.clocks.m = 3;
    this.clocks.t = 12;
  }

  private ld_a16_SP() {
    const address = this.fetchWord();
    this.memory.writeByte(address, this.registers.sp & 0xff); // Lower Byte
    this.memory.writeByte(
      (address + 1) & 0xffff,
      (this.registers.sp >> 8) & 0xff
    ); // Higher Byte
    this.clocks.m = 5;
    this.clocks.t = 20;
  }

  private ldBC_A() {
    this.memory.writeByte(this.registers.bc, this.registers.a);
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  private ldDE_A() {
    this.memory.writeByte(this.registers.de, this.registers.a);
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  /**
   * LD (HL+), A (0x22)
   * Store A into (HL), then increment HL.
   */
  private ldHLi_A() {
    this.memory.writeByte(this.registers.hl, this.registers.a);
    this.registers.hl = (this.registers.hl + 1) & 0xffff;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  /**
   * LD (HL-), A (0x32)
   * Store A into (HL), then decrement HL.
   */
  private ldHLd_A() {
    this.memory.writeByte(this.registers.hl, this.registers.a);
    this.registers.hl = (this.registers.hl - 1) & 0xffff;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  /**
   * LD (HL), A (0x77)
   * Store A into (HL), HL unchanged.
   */
  private ldHL_A() {
    this.memory.writeByte(this.registers.hl, this.registers.a);
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  /**
   * Load the value of register B into memory at address (HL) (LD (HL), B).
   * Stores the value of register B into the memory location pointed to by HL.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldHL_B() {
    this.memory.writeByte(this.registers.hl, this.registers.b); // Store B into (HL)
    this.clocks.m = 2; // 8 clock cycles
    this.clocks.t = 8;
  }

  /**
   * Load the value of register C into memory at address (HL) (LD (HL), C).
   * Stores the value of register C into the memory location pointed to by HL.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldHL_C() {
    this.memory.writeByte(this.registers.hl, this.registers.c); // Store C into (HL)
    this.clocks.m = 2; // 8 clock cycles
    this.clocks.t = 8;
  }

  /**
   * Load the value of register D into memory at address (HL) (LD (HL), D).
   * Stores the value of register D into the memory location pointed to by HL.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldHL_D() {
    this.memory.writeByte(this.registers.hl, this.registers.d); // Store D into (HL)
    this.clocks.m = 2; // 8 clock cycles
    this.clocks.t = 8;
  }

  /**
   * Load the value of register E into memory at address (HL) (LD (HL), E).
   * Stores the value of register E into the memory location pointed to by HL.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldHL_E() {
    this.memory.writeByte(this.registers.hl, this.registers.e); // Store E into (HL)
    this.clocks.m = 2; // 8 clock cycles
    this.clocks.t = 8;
  }

  /**
   * Load the value of register H into memory at address (HL) (LD (HL), H).
   * Stores the value of register H into the memory location pointed to by HL.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldHL_H() {
    this.memory.writeByte(this.registers.hl, this.registers.h); // Store H into (HL)
    this.clocks.m = 2; // 8 clock cycles
    this.clocks.t = 8;
  }

  /**
   * Load the value of register L into memory at address (HL) (LD (HL), L).
   * Stores the value of register L into the memory location pointed to by HL.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldHL_L() {
    this.memory.writeByte(this.registers.hl, this.registers.l); // Store L into (HL)
    this.clocks.m = 2; // 8 clock cycles
    this.clocks.t = 8;
  }

  /**
   * Load the value of register A into register A (LD A, A).
   * Copies the value of the A register into itself (no effect).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldA_A() {
    this.registers.a = this.registers.a; // No effect
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register B into register A (LD A, B).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldA_B() {
    this.registers.a = this.registers.b; // Copy the value of B into A
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register C into register A (LD A, C).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldA_C() {
    this.registers.a = this.registers.c; // Copy the value of C into A
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register D into register A (LD A, D).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldA_D() {
    this.registers.a = this.registers.d; // Copy the value of D into A
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register E into register A (LD A, E).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldA_E() {
    this.registers.a = this.registers.e; // Copy the value of E into A
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register H into register A (LD A, H).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldA_H() {
    this.registers.a = this.registers.h; // Copy the value of H into A
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register L into register A (LD A, L).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldA_L() {
    this.registers.a = this.registers.l; // Copy the value of L into A
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value at address (HL) into register A (LD A, (HL)).
   * Loads the byte from memory pointed to by HL into the A register.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldA_HL() {
    this.registers.a = this.memory.readByte(this.registers.hl); // Load the value at (HL) into A
    this.clocks.m = 2; // 8 clock cycles
    this.clocks.t = 8;
  }

  /**
   * Load the value of register A into memory at address BC (LD (BC), A).
   * Stores the value of register A into the memory location pointed to by BC.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldA_BC() {
    this.registers.a = this.memory.readByte(this.registers.bc);
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  private ldA_DE() {
    this.registers.a = this.memory.readByte(this.registers.de);
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  /**
   * LD A, (HL+) (0x2A)
   * Loads the value from memory pointed to by HL into A, then increments HL.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldA_HLi() {
    this.registers.a = this.memory.readByte(this.registers.hl);
    this.registers.hl = (this.registers.hl + 1) & 0xffff;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  /**
   * LD A, (HL-) (0x3A)
   * Loads the value from memory pointed to by HL into A, then decrements HL.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldA_HLd() {
    this.registers.a = this.memory.readByte(this.registers.hl);
    this.registers.hl = (this.registers.hl - 1) & 0xffff;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  /**
   * Load the value of register A into register B (LD B, A).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldB_A() {
    this.registers.b = this.registers.a; // Copy the value of A into B
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load B into B (LD B, B).
   * Copies the value of the B register into itself.
   * This is effectively a no-operation (NOP) for the B register.
   */
  private ldB_B() {
    this.registers.b = this.registers.b;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * Load the value of register C into register B (LD B, C).
   */
  private ldB_C() {
    this.registers.b = this.registers.c;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * Load the value of register D into register B (LD B, D).
   */
  private ldB_D() {
    this.registers.b = this.registers.d;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * Load the value of register E into register B (LD B, E).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldB_E() {
    this.registers.b = this.registers.e; // Copy the value of E into B
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register H into register B (LD B, H).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldB_H() {
    this.registers.b = this.registers.h; // Copy the value of H into B
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register L into register B (LD B, L).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldB_L() {
    this.registers.b = this.registers.l; // Copy the value of L into B
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value at address (HL) into register B (LD B, (HL)).
   * Loads the byte from memory pointed to by HL into the B register.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldB_HL() {
    this.registers.b = this.memory.readByte(this.registers.hl); // Load value from memory at HL into B
    this.clocks.m = 2; // 8 clock cycles
    this.clocks.t = 8;
  }

  /**
   * Load the value of register A into register C (LD C, A).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldC_A() {
    this.registers.c = this.registers.a; // Copy the value of A into C
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register B into register C (LD C, B).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldC_B() {
    this.registers.c = this.registers.b; // Copy the value of B into C
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register C into register C (LD C, C).
   * Copies the value of the C register into itself (no effect).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldC_C() {
    this.registers.c = this.registers.c; // No effect
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register D into register C (LD C, D).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldC_D() {
    this.registers.c = this.registers.d; // Copy the value of D into C
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register E into register C (LD C, E).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldC_E() {
    this.registers.c = this.registers.e; // Copy the value of E into C
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register H into register C (LD C, H).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldC_H() {
    this.registers.c = this.registers.h; // Copy the value of H into C
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register L into register C (LD C, L).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldC_L() {
    this.registers.c = this.registers.l; // Copy the value of L into C
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value at address (HL) into register C (LD C, (HL)).
   * Loads the byte from memory pointed to by HL into the C register.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldC_HL() {
    this.registers.c = this.memory.readByte(this.registers.hl); // Load value from memory at HL into C
    this.clocks.m = 2; // 8 clock cycles
    this.clocks.t = 8;
  }

  /**
   * Load the value of register A into register D (LD D, A).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldD_A() {
    this.registers.d = this.registers.a; // Copy the value of A into D
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register B into register D (LD D, B).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldD_B() {
    this.registers.d = this.registers.b; // Copy the value of B into D
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register C into register D (LD D, C).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldD_C() {
    this.registers.d = this.registers.c; // Copy the value of C into D
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register D into register D (LD D, D).
   * Copies the value of the D register into itself (no effect).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldD_D() {
    this.registers.d = this.registers.d; // No effect
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register E into register D (LD D, E).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldD_E() {
    this.registers.d = this.registers.e; // Copy the value of E into D
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register H into register D (LD D, H).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldD_H() {
    this.registers.d = this.registers.h; // Copy the value of H into D
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register L into register D (LD D, L).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldD_L() {
    this.registers.d = this.registers.l; // Copy the value of L into D
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value at address (HL) into register D (LD D, (HL)).
   * Loads the byte from memory pointed to by HL into the D register.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldD_HL() {
    this.registers.d = this.memory.readByte(this.registers.hl); // Load value from memory at HL into D
    this.clocks.m = 2; // 8 clock cycles
    this.clocks.t = 8;
  }

  /**
   * Load the value of register A into register E (LD E, A).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldE_A() {
    this.registers.e = this.registers.a; // Copy the value of A into E
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register B into register E (LD E, B).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldE_B() {
    this.registers.e = this.registers.b; // Copy the value of B into E
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register C into register E (LD E, C).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldE_C() {
    this.registers.e = this.registers.c; // Copy the value of C into E
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register D into register E (LD E, D).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldE_D() {
    this.registers.e = this.registers.d; // Copy the value of D into E
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register E into register E (LD E, E).
   * Copies the value of the E register into itself (no effect).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldE_E() {
    this.registers.e = this.registers.e; // No effect
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register H into register E (LD E, H).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldE_H() {
    this.registers.e = this.registers.h; // Copy the value of H into E
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register L into register E (LD E, L).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldE_L() {
    this.registers.e = this.registers.l; // Copy the value of L into E
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value at address (HL) into register E (LD E, (HL)).
   * Loads the byte from memory pointed to by HL into the E register.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldE_HL() {
    this.registers.e = this.memory.readByte(this.registers.hl); // Load value from memory at HL into E
    this.clocks.m = 2; // 8 clock cycles
    this.clocks.t = 8;
  }

  /**
   * Load the value of register A into register H (LD H, A).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldH_A() {
    this.registers.h = this.registers.a; // Copy the value of A into H
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register B into register H (LD H, B).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldH_B() {
    this.registers.h = this.registers.b; // Copy the value of B into H
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register C into register H (LD H, C).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldH_C() {
    this.registers.h = this.registers.c; // Copy the value of C into H
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register D into register H (LD H, D).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldH_D() {
    this.registers.h = this.registers.d; // Copy the value of D into H
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register E into register H (LD H, E).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldH_E() {
    this.registers.h = this.registers.e; // Copy the value of E into H
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register H into register H (LD H, H).
   * Copies the value of the H register into itself (no effect).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldH_H() {
    this.registers.h = this.registers.h; // No effect
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register L into register H (LD H, L).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldH_L() {
    this.registers.h = this.registers.l; // Copy the value of L into H
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value at address (HL) into register H (LD H, (HL)).
   * Loads the byte from memory pointed to by HL into the H register.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldH_HL() {
    this.registers.h = this.memory.readByte(this.registers.hl); // Load value from memory at HL into H
    this.clocks.m = 2; // 8 clock cycles
    this.clocks.t = 8;
  }

  /**
   * Load the value of register A into register L (LD L, A).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldL_A() {
    this.registers.l = this.registers.a; // Copy the value of A into L
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register B into register L (LD L, B).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldL_B() {
    this.registers.l = this.registers.b; // Copy the value of B into L
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register C into register L (LD L, C).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldL_C() {
    this.registers.l = this.registers.c; // Copy the value of C into L
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register D into register L (LD L, D).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldL_D() {
    this.registers.l = this.registers.d; // Copy the value of D into L
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register E into register L (LD L, E).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldL_E() {
    this.registers.l = this.registers.e; // Copy the value of E into L
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register H into register L (LD L, H).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldL_H() {
    this.registers.l = this.registers.h; // Copy the value of H into L
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value of register L into register L (LD L, L).
   * Copies the value of the L register into itself (no effect).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private ldL_L() {
    this.registers.l = this.registers.l; // No effect
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Load the value at address (HL) into register L (LD L, (HL)).
   * Loads the byte from memory pointed to by HL into the L register.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 8
   */
  private ldL_HL() {
    this.registers.l = this.memory.readByte(this.registers.hl); // Load value from memory at HL into L
    this.clocks.m = 2; // 8 clock cycles
    this.clocks.t = 8;
  }

  /**
   * Increment the value of register BC (INC BC).
   * Increments the value of the BC register pair by 1.
   *
   * Clock cycles: 8
   */
  private incBC() {
    this.registers.bc = (this.registers.bc + 1) & 0xffff;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  private incDE() {
    this.registers.de = (this.registers.de + 1) & 0xffff;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  /**
   * Increment HL register or the value at address (HL).
   * @param memoryMode If true, increment value at (HL); if false, increment HL register.
   */
  private incHL(memoryMode: boolean = false) {
    if (memoryMode) {
      // INC (HL)
      const value = this.memory.readByte(this.registers.hl);
      const result = (value + 1) & 0xff;
      this.memory.writeByte(this.registers.hl, result);
      this.setFlag("Z", result === 0);
      this.setFlag("N", false);
      this.setFlag("H", (value & 0x0f) + 1 > 0x0f);
      this.clocks.m = 3; // 12 clock cycles
      this.clocks.t = 12;
    } else {
      // INC HL
      this.registers.hl = (this.registers.hl + 1) & 0xffff;
      // No flags affected
      this.clocks.m = 2; // 8 clock cycles
      this.clocks.t = 8;
    }
  }

  private incSP() {
    this.registers.sp = (this.registers.sp + 1) & 0xffff;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  private decSP() {
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  /**
   * Increment A (INC A).
   * Increments the value of the A register by 1.
   *
   * Flags affected:
   * - Z (Zero): Set if the result is 0.
   * - N (Subtract): Cleared to 0.
   * - H (Half Carry): Set if there is a carry from bit 3 to bit 4.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private incA() {
    this.registers.a = (this.registers.a + 1) & 0xff;
    this.setFlag("Z", this.registers.a === 0);
    this.setFlag("N", false);
    this.setFlag("H", (this.registers.a & 0x0f) === 0);
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * Decrement A (DEC A).
   * Decrements the value of the A register by 1.
   *
   * Flags affected:
   * - Z (Zero): Set if the result is 0.
   * - N (Subtract): Set to 1.
   * - H (Half Carry): Set if there is a borrow from bit 4 to bit 3.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private decA() {
    this.registers.a = (this.registers.a - 1) & 0xff;
    this.setFlag("Z", this.registers.a === 0);
    this.setFlag("N", true);
    this.setFlag("H", (this.registers.a & 0x0f) === 0x0f);
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  private incB() {
    this.registers.b = (this.registers.b + 1) & 0xffff;
    this.setFlag("Z", this.registers.b === 0);
    this.setFlag("N", false);
    this.setFlag("H", (this.registers.b & 0x0f) === 0);
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  private decB() {
    this.registers.b = (this.registers.b - 1) & 0xffff;
    this.setFlag("Z", this.registers.b === 0);
    this.setFlag("N", true);
    this.setFlag("H", (this.registers.b & 0x0f) === 0x0f);
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  private incC() {
    this.registers.c = (this.registers.c + 1) & 0xffff;
    this.setFlag("Z", this.registers.c === 0);
    this.setFlag("N", false);
    this.setFlag("H", (this.registers.c & 0x0f) === 0);
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  private decC() {
    this.registers.c = (this.registers.c - 1) & 0xffff;
    this.setFlag("Z", this.registers.c === 0);
    this.setFlag("N", true);
    this.setFlag("H", (this.registers.c & 0x0f) === 0x0f);
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  private incD() {
    this.registers.d = (this.registers.d + 1) & 0xffff;
    this.setFlag("Z", this.registers.d === 0);
    this.setFlag("N", false);
    this.setFlag("H", (this.registers.d & 0x0f) === 0);
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  private decD() {
    this.registers.c = (this.registers.d - 1) & 0xffff;
    this.setFlag("Z", this.registers.d === 0);
    this.setFlag("N", true);
    this.setFlag("H", (this.registers.d & 0x0f) === 0x0f);
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  private incE() {
    this.registers.e = (this.registers.e + 1) & 0xffff;
    this.setFlag("Z", this.registers.e === 0);
    this.setFlag("N", false);
    this.setFlag("H", (this.registers.e & 0x0f) === 0);
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  private decE() {
    this.registers.e = (this.registers.e - 1) & 0xffff;
    this.setFlag("Z", this.registers.e === 0);
    this.setFlag("N", true);
    this.setFlag("H", (this.registers.e & 0x0f) === 0x0f);
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  private incH() {
    this.registers.h = (this.registers.h + 1) & 0xff;
    this.setFlag("Z", this.registers.h === 0);
    this.setFlag("N", false);
    this.setFlag("H", (this.registers.h & 0x0f) === 0);
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  private decH() {
    this.registers.h = (this.registers.h - 1) & 0xff;
    this.setFlag("Z", this.registers.h === 0);
    this.setFlag("N", true);
    this.setFlag("H", (this.registers.h & 0x0f) === 0x0f);
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  private incL() {
    this.registers.l = (this.registers.l + 1) & 0xff;
    this.setFlag("Z", this.registers.l === 0);
    this.setFlag("N", false);
    this.setFlag("H", (this.registers.l & 0x0f) === 0);
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  private decL() {
    this.registers.l = (this.registers.l - 1) & 0xff;
    this.setFlag("Z", this.registers.l === 0);
    this.setFlag("N", true);
    this.setFlag("H", (this.registers.l & 0x0f) === 0x0f);
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  private decBC() {
    this.registers.bc = (this.registers.bc - 1) & 0xffff;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  private decDE() {
    this.registers.de = (this.registers.de - 1) & 0xffff;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  /**
   * Decrement HL register or the value at address (HL).
   * @param memoryMode If true, decrement value at (HL); if false, decrement HL register.
   */
  private decHL(memoryMode: boolean = false) {
    if (memoryMode) {
      // DEC (HL)
      const value = this.memory.readByte(this.registers.hl);
      const result = (value - 1) & 0xff;
      this.memory.writeByte(this.registers.hl, result);
      this.setFlag("Z", result === 0);
      this.setFlag("N", true);
      this.setFlag("H", (value & 0x0f) === 0x00);
      this.clocks.m = 3; // 12 clock cycles
      this.clocks.t = 12;
    } else {
      // DEC HL
      this.registers.hl = (this.registers.hl - 1) & 0xffff;
      // No flags affected
      this.clocks.m = 2; // 8 clock cycles
      this.clocks.t = 8;
    }
  }

  /**
   * Rotate circular register A left through carry.
   * Reset Z, N, H and set C if MSB of A is 1
   */
  private rlcA() {
    const carry = (this.registers.a >> 7) & 0x01;
    this.registers.a = ((this.registers.a << 1) & 0xff) | carry;
    this.setFlag("Z", false);
    this.setFlag("N", false);
    this.setFlag("H", false);
    this.setFlag("C", carry === 1);
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * Rotate circular register A right through carry.
   * Reset Z, N, H and set C if LSB of A is 1
   */
  private rrcA() {
    const carry = this.registers.a & 0x01;
    this.registers.a = ((this.registers.a >> 1) & 0xff) | (carry << 7);
    this.setFlag("Z", false);
    this.setFlag("N", false);
    this.setFlag("H", false);
    this.setFlag("C", carry === 1);
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * Rotate register A left through carry.
   * Reset Z, N, H and set C if MSB of A is 1
   */
  private rlA() {
    const carry = (this.registers.a >> 7) & 0x01;
    this.registers.a =
      ((this.registers.a << 1) & 0xff) | (this.registers.f & 0x10 ? 1 : 0);
    this.setFlag("Z", false);
    this.setFlag("N", false);
    this.setFlag("H", false);
    this.setFlag("C", carry === 1);
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * Rotate register A left through carry.
   * Reset Z, N, H and set C if MSB of A is 1
   */
  private rrA() {
    const carry = this.registers.a & 0x01;
    this.registers.a =
      ((this.registers.a >> 1) & 0xff) | (this.registers.f & 0x10 ? 0x80 : 0);
    this.setFlag("Z", false);
    this.setFlag("N", false);
    this.setFlag("H", false);
    this.setFlag("C", carry === 1);
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * ADD A, B (0x80)
   * Adds the value of register B to register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set if carry from bit 3.
   * - C (Carry): Set if carry from bit 7.
   *
   * Clock cycles: 4
   */
  private addA_B() {
    const a = this.registers.a;
    const b = this.registers.b;
    const result = (a + b) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", (a & 0xf) + (b & 0xf) > 0xf);
    this.setFlag("C", a + b > 0xff);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * ADD A, C (0x81)
   * Adds the value of register C to register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set if carry from bit 3.
   * - C (Carry): Set if carry from bit 7.
   *
   * Clock cycles: 4
   */
  private addA_C() {
    const a = this.registers.a;
    const c = this.registers.c;
    const result = (a + c) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", (a & 0xf) + (c & 0xf) > 0xf);
    this.setFlag("C", a + c > 0xff);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * ADD A, D (0x82)
   * Adds the value of register D to register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set if carry from bit 3.
   * - C (Carry): Set if carry from bit 7.
   *
   * Clock cycles: 4
   */
  private addA_D() {
    const a = this.registers.a;
    const d = this.registers.d;
    const result = (a + d) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", (a & 0xf) + (d & 0xf) > 0xf);
    this.setFlag("C", a + d > 0xff);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * ADD A, E (0x83)
   * Adds the value of register E to register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set if carry from bit 3.
   * - C (Carry): Set if carry from bit 7.
   *
   * Clock cycles: 4
   */
  private addA_E() {
    const a = this.registers.a;
    const e = this.registers.e;
    const result = (a + e) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", (a & 0xf) + (e & 0xf) > 0xf);
    this.setFlag("C", a + e > 0xff);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * ADC A, B (0x88)
   * Adds the value of register B and the carry flag to register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set if carry from bit 3.
   * - C (Carry): Set if carry from bit 7.
   *
   * Clock cycles: 4
   */
  private adcA_B() {
    const a = this.registers.a;
    const b = this.registers.b;
    const carry = this.registers.f & 0x10 ? 1 : 0;
    const result = (a + b + carry) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", (a & 0xf) + (b & 0xf) + carry > 0xf);
    this.setFlag("C", a + b + carry > 0xff);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * ADC A, C (0x89)
   * Adds the value of register C and the carry flag to register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set if carry from bit 3.
   * - C (Carry): Set if carry from bit 7.
   *
   * Clock cycles: 4
   */
  private adcA_C() {
    const a = this.registers.a;
    const c = this.registers.c;
    const carry = this.registers.f & 0x10 ? 1 : 0;
    const result = (a + c + carry) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", (a & 0xf) + (c & 0xf) + carry > 0xf);
    this.setFlag("C", a + c + carry > 0xff);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * ADC A, H (0x8C)
   * Adds the value of register H and the carry flag to register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set if carry from bit 3.
   * - C (Carry): Set if carry from bit 7.
   *
   * Clock cycles: 4
   */
  private adcA_H() {
    const a = this.registers.a;
    const h = this.registers.h;
    const carry = this.registers.f & 0x10 ? 1 : 0;
    const result = (a + h + carry) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", (a & 0xf) + (h & 0xf) + carry > 0xf);
    this.setFlag("C", a + h + carry > 0xff);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * SUB A, B (0x90)
   * Subtracts the value of register B from register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Set.
   * - H (Half Carry): Set if borrow from bit 4.
   * - C (Carry): Set if borrow (A < B).
   *
   * Clock cycles: 4
   */
  private subA_B() {
    const a = this.registers.a;
    const b = this.registers.b;
    const result = (a - b) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", true);
    this.setFlag("H", (a & 0xf) < (b & 0xf));
    this.setFlag("C", a < b);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * SUB A, C (0x91)
   * Subtracts the value of register C from register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Set.
   * - H (Half Carry): Set if borrow from bit 4.
   * - C (Carry): Set if borrow (A < C).
   *
   * Clock cycles: 4
   */
  private subA_C() {
    const a = this.registers.a;
    const c = this.registers.c;
    const result = (a - c) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", true);
    this.setFlag("H", (a & 0xf) < (c & 0xf));
    this.setFlag("C", a < c);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * SUB A, D (0x92)
   * Subtracts the value of register D from register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Set.
   * - H (Half Carry): Set if borrow from bit 4.
   * - C (Carry): Set if borrow (A < D).
   *
   * Clock cycles: 4
   */
  private subA_D() {
    const a = this.registers.a;
    const d = this.registers.d;
    const result = (a - d) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", true);
    this.setFlag("H", (a & 0xf) < (d & 0xf));
    this.setFlag("C", a < d);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * SUB A, E (0x93)
   * Subtracts the value of register E from register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Set.
   * - H (Half Carry): Set if borrow from bit 4.
   * - C (Carry): Set if borrow (A < E).
   *
   * Clock cycles: 4
   */
  private subA_E() {
    const a = this.registers.a;
    const e = this.registers.e;
    const result = (a - e) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", true);
    this.setFlag("H", (a & 0xf) < (e & 0xf));
    this.setFlag("C", a < e);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * SUB A, H (0x94)
   * Subtracts the value of register H from register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Set.
   * - H (Half Carry): Set if borrow from bit 4.
   * - C (Carry): Set if borrow (A < H).
   *
   * Clock cycles: 4
   */
  private subA_H() {
    const a = this.registers.a;
    const h = this.registers.h;
    const result = (a - h) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", true);
    this.setFlag("H", (a & 0xf) < (h & 0xf));
    this.setFlag("C", a < h);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * SUB A, L (0x94)
   * Subtracts the value of register L from register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Set.
   * - H (Half Carry): Set if borrow from bit 4.
   * - C (Carry): Set if borrow (A < L).
   *
   * Clock cycles: 4
   */
  private subA_L() {
    const a = this.registers.a;
    const l = this.registers.l;
    const result = (a - l) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", true);
    this.setFlag("H", (a & 0xf) < (l & 0xf));
    this.setFlag("C", a < l);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * SUB A, (HL) (0x96)
   * Subtracts the value at address (HL) from register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Set.
   * - H (Half Carry): Set if borrow from bit 4.
   * - C (Carry): Set if borrow (A < value at HL).
   *
   * Clock cycles: 8
   */
  private subA_HL() {
    const value = this.memory.readByte(this.registers.hl);
    const a = this.registers.a;
    const result = (a - value) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", true);
    this.setFlag("H", (a & 0xf) < (value & 0xf));
    this.setFlag("C", a < value);
    this.registers.a = result;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  /**
   * SUB A, A (0x97)
   * Subtracts the value of register A from itself (result is always 0).
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Set.
   * - H (Half Carry): Set if borrow from bit 4.
   * - C (Carry): Set if borrow (A < A, which is never true).
   *
   * Clock cycles: 4
   */
  private subA_A() {
    const a = this.registers.a;
    const result = (a - a) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", true);
    this.setFlag("H", (a & 0xf) < (a & 0xf));
    this.setFlag("C", a < a);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * SBC A, B (0x98)
   * Subtracts the value of register B and the carry flag from register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Set.
   * - H (Half Carry): Set if borrow from bit 4.
   * - C (Carry): Set if borrow (A < B + carry).
   *
   * Clock cycles: 4
   */
  private sbcA_B() {
    const a = this.registers.a;
    const b = this.registers.b;
    const carry = this.registers.f & 0x10 ? 1 : 0;
    const result = (a - b - carry) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", true);
    this.setFlag("H", (a & 0xf) < (b & 0xf) + carry);
    this.setFlag("C", a < b + carry);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * SBC A, C (0x99)
   * Subtracts the value of register C and the carry flag from register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Set.
   * - H (Half Carry): Set if borrow from bit 4.
   * - C (Carry): Set if borrow (A < C + carry).
   *
   * Clock cycles: 4
   */
  private sbcA_C() {
    const a = this.registers.a;
    const c = this.registers.c;
    const carry = this.registers.f & 0x10 ? 1 : 0;
    const result = (a - c - carry) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", true);
    this.setFlag("H", (a & 0xf) < (c & 0xf) + carry);
    this.setFlag("C", a < c + carry);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * SBC A, D (0x9A)
   * Subtracts the value of register D and the carry flag from register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Set.
   * - H (Half Carry): Set if borrow from bit 4.
   * - C (Carry): Set if borrow (A < D + carry).
   *
   * Clock cycles: 4
   */
  private sbcA_D() {
    const a = this.registers.a;
    const d = this.registers.d;
    const carry = this.registers.f & 0x10 ? 1 : 0;
    const result = (a - d - carry) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", true);
    this.setFlag("H", (a & 0xf) < (d & 0xf) + carry);
    this.setFlag("C", a < d + carry);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * SBC A, E (0x9B)
   * Subtracts the value of register E and the carry flag from register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Set.
   * - H (Half Carry): Set if borrow from bit 4.
   * - C (Carry): Set if borrow (A < E + carry).
   *
   * Clock cycles: 4
   */
  private sbcA_E() {
    const a = this.registers.a;
    const e = this.registers.e;
    const carry = this.registers.f & 0x10 ? 1 : 0;
    const result = (a - e - carry) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", true);
    this.setFlag("H", (a & 0xf) < (e & 0xf) + carry);
    this.setFlag("C", a < e + carry);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * SBC A, H (0x9C)
   * Subtracts the value of register H and the carry flag from register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Set.
   * - H (Half Carry): Set if borrow from bit 4.
   * - C (Carry): Set if borrow (A < H + carry).
   *
   * Clock cycles: 4
   */
  private sbcA_H() {
    const a = this.registers.a;
    const h = this.registers.h;
    const carry = this.registers.f & 0x10 ? 1 : 0;
    const result = (a - h - carry) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", true);
    this.setFlag("H", (a & 0xf) < (h & 0xf) + carry);
    this.setFlag("C", a < h + carry);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * SBC A, L (0x9D)
   * Subtracts the value of register L and the carry flag from register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Set.
   * - H (Half Carry): Set if borrow from bit 4.
   * - C (Carry): Set if borrow (A < L + carry).
   *
   * Clock cycles: 4
   */
  private sbcA_L() {
    const a = this.registers.a;
    const l = this.registers.l;
    const carry = this.registers.f & 0x10 ? 1 : 0;
    const result = (a - l - carry) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", true);
    this.setFlag("H", (a & 0xf) < (l & 0xf) + carry);
    this.setFlag("C", a < l + carry);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * SBC A, (HL) (0x9E)
   * Subtracts the value at address (HL) and the carry flag from register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Set.
   * - H (Half Carry): Set if borrow from bit 4.
   * - C (Carry): Set if borrow (A < value at HL + carry).
   *
   * Clock cycles: 8
   */
  private sbcA_HL() {
    const value = this.memory.readByte(this.registers.hl);
    const a = this.registers.a;
    const carry = this.registers.f & 0x10 ? 1 : 0;
    const result = (a - value - carry) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", true);
    this.setFlag("H", (a & 0xf) < (value & 0xf) + carry);
    this.setFlag("C", a < value + carry);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 8;
  }

  /**
   * SBC A, A (0x9F)
   * Subtracts the value of register A from itself (result is always 0).
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Set.
   * - H (Half Carry): Set if borrow from bit 4.
   * - C (Carry): Set if borrow (A < A, which is never true).
   *
   * Clock cycles: 4
   */
  private sbcA_A() {
    const a = this.registers.a;
    const carry = this.registers.f & 0x10 ? 1 : 0;
    const result = (a - a - carry) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", true);
    this.setFlag("H", (a & 0xf) < (a & 0xf) + carry);
    this.setFlag("C", a < a + carry);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * ADC A, L (0x8D)
   * Adds the value of register L and the carry flag to register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set if carry from bit 3.
   * - C (Carry): Set if carry from bit 7.
   *
   * Clock cycles: 4
   */
  private adcA_L() {
    const a = this.registers.a;
    const l = this.registers.l;
    const carry = this.registers.f & 0x10 ? 1 : 0;
    const result = (a + l + carry) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", (a & 0xf) + (l & 0xf) + carry > 0xf);
    this.setFlag("C", a + l + carry > 0xff);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * ADC A, (HL) (0x8E)
   * Adds the value at address (HL) and the carry flag to register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set if carry from bit 3.
   * - C (Carry): Set if carry from bit 7.
   *
   * Clock cycles: 8
   */
  private adcA_HL() {
    const value = this.memory.readByte(this.registers.hl);
    const a = this.registers.a;
    const carry = this.registers.f & 0x10 ? 1 : 0;
    const result = (a + value + carry) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", (a & 0xf) + (value & 0xf) + carry > 0xf);
    this.setFlag("C", a + value + carry > 0xff);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * ADC A, A (0x8F)
   * Adds the value of register A and the carry flag to register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set if carry from bit 3.
   * - C (Carry): Set if carry from bit 7.
   *
   * Clock cycles: 4
   */
  private adcA_A() {
    const a = this.registers.a;
    const carry = this.registers.f & 0x10 ? 1 : 0;
    const result = (a + a + carry) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", (a & 0xf) + (a & 0xf) + carry > 0xf);
    this.setFlag("C", a + a + carry > 0xff);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * ADC A, D (0x8A)
   * Adds the value of register D and the carry flag to register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set if carry from bit 3.
   * - C (Carry): Set if carry from bit 7.
   *
   * Clock cycles: 4
   */
  private adcA_D() {
    const a = this.registers.a;
    const d = this.registers.d;
    const carry = this.registers.f & 0x10 ? 1 : 0;
    const result = (a + d + carry) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", (a & 0xf) + (d & 0xf) + carry > 0xf);
    this.setFlag("C", a + d + carry > 0xff);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * ADC A, E (0x8B)
   * Adds the value of register E and the carry flag to register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set if carry from bit 3.
   * - C (Carry): Set if carry from bit 7.
   *
   * Clock cycles: 4
   */
  private adcA_E() {
    const a = this.registers.a;
    const e = this.registers.e;
    const carry = this.registers.f & 0x10 ? 1 : 0;
    const result = (a + e + carry) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", (a & 0xf) + (e & 0xf) + carry > 0xf);
    this.setFlag("C", a + e + carry > 0xff);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * ADD A, H (0x84)
   * Adds the value of register H to register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set if carry from bit 3.
   * - C (Carry): Set if carry from bit 7.
   *
   * Clock cycles: 4
   */
  private addA_H() {
    const a = this.registers.a;
    const h = this.registers.h;
    const result = (a + h) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", (a & 0xf) + (h & 0xf) > 0xf);
    this.setFlag("C", a + h > 0xff);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * ADD A, L (0x85)
   * Adds the value of register L to register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set if carry from bit 3.
   * - C (Carry): Set if carry from bit 7.
   *
   * Clock cycles: 4
   */
  private addA_L() {
    const a = this.registers.a;
    const l = this.registers.l;
    const result = (a + l) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", (a & 0xf) + (l & 0xf) > 0xf);
    this.setFlag("C", a + l > 0xff);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * ADD A, (HL) (0x86)
   * Adds the value at address (HL) to register A.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set if carry from bit 3.
   * - C (Carry): Set if carry from bit 7.
   *
   * Clock cycles: 8
   */
  private addA_HL() {
    const value = this.memory.readByte(this.registers.hl);
    const a = this.registers.a;
    const result = (a + value) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", (a & 0xf) + (value & 0xf) > 0xf);
    this.setFlag("C", a + value > 0xff);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * ADD A, A (0x87)
   * Adds the value of register A to itself.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set if carry from bit 3.
   * - C (Carry): Set if carry from bit 7.
   *
   * Clock cycles: 4
   */
  private addA_A() {
    const a = this.registers.a;
    const result = (a + a) & 0xff;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", (a & 0xf) + (a & 0xf) > 0xf);
    this.setFlag("C", a + a > 0xff);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * AND A, B (0xA0)
   * Performs a bitwise AND operation between register A and register B.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set.
   * - C (Carry): Reset.
   *
   * Clock cycles: 4
   */
  private andA_B() {
    const b = this.registers.b;
    const result = this.registers.a & b;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", true);
    this.setFlag("C", false);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * AND A, C (0xA1)
   * Performs a bitwise AND operation between register A and register C.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set.
   * - C (Carry): Reset.
   *
   * Clock cycles: 4
   */
  private andA_C() {
    const c = this.registers.c;
    const result = this.registers.a & c;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", true);
    this.setFlag("C", false);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * AND A, D (0xA2)
   * Performs a bitwise AND operation between register A and register D.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set.
   * - C (Carry): Reset.
   *
   * Clock cycles: 4
   */
  private andA_D() {
    const d = this.registers.d;
    const result = this.registers.a & d;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", true);
    this.setFlag("C", false);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * AND A, E (0xA3)
   * Performs a bitwise AND operation between register A and register E.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set.
   * - C (Carry): Reset.
   *
   * Clock cycles: 4
   */
  private andA_E() {
    const e = this.registers.e;
    const result = this.registers.a & e;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", true);
    this.setFlag("C", false);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * AND A, H (0xA4)
   * Performs a bitwise AND operation between register A and register H.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set.
   * - C (Carry): Reset.
   *
   * Clock cycles: 4
   */
  private andA_H() {
    const h = this.registers.h;
    const result = this.registers.a & h;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", true);
    this.setFlag("C", false);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * AND A, L (0xA5)
   * Performs a bitwise AND operation between register A and register L.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set.
   * - C (Carry): Reset.
   *
   * Clock cycles: 4
   */
  private andA_L() {
    const l = this.registers.l;
    const result = this.registers.a & l;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", true);
    this.setFlag("C", false);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * AND A, (HL) (0xA6)
   * Performs a bitwise AND operation between register A and the value at address (HL).
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set.
   * - C (Carry): Reset.
   *
   * Clock cycles: 8
   */
  private andA_HL() {
    const value = this.memory.readByte(this.registers.hl);
    const result = this.registers.a & value;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", true);
    this.setFlag("C", false);
    this.registers.a = result;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  /**
   * AND A, A (0xA7)
   * Performs a bitwise AND operation between register A and itself (result is always A).
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Set.
   * - C (Carry): Reset.
   *
   * Clock cycles: 4
   */
  private andA_A() {
    const result = this.registers.a & this.registers.a;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", true);
    this.setFlag("C", false);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * XOR A, B (0xA8)
   * Performs a bitwise XOR operation between register A and register B.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Reset.
   * - C (Carry): Reset.
   *
   * Clock cycles: 4
   */
  private xorA_B() {
    const b = this.registers.b;
    const result = this.registers.a ^ b;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", false);
    this.setFlag("C", false);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * XOR A, C (0xA9)
   * Performs a bitwise XOR operation between register A and register C.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Reset.
   * - C (Carry): Reset.
   *
   * Clock cycles: 4
   */
  private xorA_C() {
    const c = this.registers.c;
    const result = this.registers.a ^ c;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", false);
    this.setFlag("C", false);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * XOR A, D (0xAA)
   * Performs a bitwise XOR operation between register A and register D.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Reset.
   * - C (Carry): Reset.
   *
   * Clock cycles: 4
   */
  private xorA_D() {
    const d = this.registers.d;
    const result = this.registers.a ^ d;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", false);
    this.setFlag("C", false);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * XOR A, E (0xAB)
   * Performs a bitwise XOR operation between register A and register E.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Reset.
   * - C (Carry): Reset.
   *
   * Clock cycles: 4
   */
  private xorA_E() {
    const e = this.registers.e;
    const result = this.registers.a ^ e;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", false);
    this.setFlag("C", false);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * XOR A, H (0xAC)
   * Performs a bitwise XOR operation between register A and register H.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Reset.
   * - C (Carry): Reset.
   *
   * Clock cycles: 4
   */
  private xorA_H() {
    const h = this.registers.h;
    const result = this.registers.a ^ h;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", false);
    this.setFlag("C", false);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * XOR A, L (0xAD)
   * Performs a bitwise XOR operation between register A and register L.
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Reset.
   * - C (Carry): Reset.
   *
   * Clock cycles: 4
   */
  private xorA_L() {
    const l = this.registers.l;
    const result = this.registers.a ^ l;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", false);
    this.setFlag("C", false);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * XOR A, (HL) (0xAE)
   * Performs a bitwise XOR operation between register A and the value at address (HL).
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Reset.
   * - C (Carry): Reset.
   *
   * Clock cycles: 8
   */
  private xorA_HL() {
    const value = this.memory.readByte(this.registers.hl);
    const result = this.registers.a ^ value;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", false);
    this.setFlag("C", false);
    this.registers.a = result;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  /**
   * XOR A, A (0xAF)
   * Performs a bitwise XOR operation between register A and itself (result is always A).
   *
   * Flags affected:
   * - Z (Zero): Set if result is 0.
   * - N (Subtract): Reset.
   * - H (Half Carry): Reset.
   * - C (Carry): Reset.
   *
   * Clock cycles: 4
   */
  private xorA_A() {
    const result = this.registers.a ^ this.registers.a;
    this.setFlag("Z", result === 0);
    this.setFlag("N", false);
    this.setFlag("H", false);
    this.setFlag("C", false);
    this.registers.a = result;
    this.clocks.m = 1;
    this.clocks.t = 4;
  }



  /**
   * Add BC to HL
   * H: Set if there is carry in bit 11
   * C: Set if there is a carry in bit 15
   * N: reset
   */
  private addHLBC() {
    const result = this.registers.bc + this.registers.hl;
    this.setFlag("C", result > 0xffff);
    this.setFlag("N", false);
    this.setFlag(
      "H",
      (this.registers.hl & 0xfff) + (this.registers.bc & 0xfff) > 0xfff
    );
    this.registers.hl = result & 0xffff;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  /**
   * Add DE to HL
   * H: Set if there is carry in bit 11
   * C: Set if there is a carry in bit 15
   * N: reset
   */
  private addHLDE() {
    const result = this.registers.de + this.registers.hl;
    this.setFlag("C", result > 0xffff);
    this.setFlag("N", false);
    this.setFlag(
      "H",
      (this.registers.hl & 0xfff) + (this.registers.de & 0xfff) > 0xfff
    );
    this.registers.hl = result & 0xffff;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  /**
   * Add HL to HL
   * H: Set if there is carry in bit 11
   * C: Set if there is a carry in bit 15
   * N: reset
   */
  private addHLHL() {
    const result = this.registers.hl + this.registers.hl;
    this.setFlag("C", result > 0xffff);
    this.setFlag(
      "H",
      (this.registers.hl & 0xfff) + (this.registers.hl & 0xfff) > 0xfff
    );
    this.setFlag("N", false);
    this.registers.hl = result & 0xffff;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  /**
   * Add SP to HL (ADD HL, SP).
   * Adds the value of the SP register to the HL register pair.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Cleared to 0.
   * - H (Half Carry): Set if there is a carry from bit 11.
   * - C (Carry): Set if there is a carry from bit 15.
   *
   * Clock cycles: 8
   */
  private addHLSP() {
    const result = this.registers.hl + this.registers.sp;
    this.setFlag("C", result > 0xffff);
    this.setFlag(
      "H",
      (this.registers.hl & 0xfff) + (this.registers.sp & 0xfff) > 0xfff
    );
    this.setFlag("N", false);
    this.registers.hl = result & 0xffff;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  private jr_r8() {
    const byte = this.memory.readByte(this.registers.pc + 1) & 0xffff;
    const offset = this.getSignedOffsetByte(byte);
    this.registers.pc = (this.registers.pc + offset) & 0xffff;
    this.clocks.m = 3;
    this.clocks.t = 12;
  }

  /**
   * Jump relative to the current program counter (PC) by adding
   * an 8-bit signed value if the Zero (Z) flag is not set.
   */
  private jrNZ_r8() {
    if ((this.registers.f & 0x80) === 0) {
      const offset = this.getSignedOffsetByte(this.fetch());
      this.registers.pc = (this.registers.pc + offset) & 0xffff;
      this.clocks.m = 3;
      this.clocks.t = 12;
    } else {
      this.registers.pc = (this.registers.pc + 1) & 0xffff;
      this.clocks.m = 2;
      this.clocks.t = 8;
    }
  }

  /**
   * Jump relative to the current program counter (PC) by adding
   * an 8-bit signed value if the Zero (Z) flag is set.
   */
  private jrZ_r8() {
    if ((this.registers.f & 0x80) !== 0) {
      // Check if Zero flag (Z) is set
      const offset = this.getSignedOffsetByte(this.fetch());
      this.registers.pc = (this.registers.pc + offset) & 0xffff;
      this.clocks.m = 3;
      this.clocks.t = 12;
    } else {
      this.registers.pc = (this.registers.pc + 1) & 0xffff;
      this.clocks.m = 2;
      this.clocks.t = 8;
    }
  }

  /**
   * Jump relative to the current program counter (PC) by adding
   * an 8-bit signed value if the Carry (C) flag is not set.
   */
  private jrNC_r8() {
    if ((this.registers.f & 0x10) === 0) {
      const offset = this.getSignedOffsetByte(this.fetch());
      this.registers.pc = (this.registers.pc + offset) & 0xffff;
      this.clocks.m = 3;
      this.clocks.t = 12;
    } else {
      this.registers.pc = (this.registers.pc + 1) & 0xffff;
      this.clocks.m = 2;
      this.clocks.t = 8;
    }
  }

  /**
   * Jump relative to the current program counter (PC) by adding
   * an 8-bit signed value if the Carry (C) flag is set.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Checked to determine if the jump is taken.
   *
   * Clock cycles:
   * - 12 cycles if the jump is taken.
   * - 8 cycles if the jump is not taken.
   */
  private jrC_r8() {
    if ((this.registers.f & 0x10) !== 0) {
      const offset = this.getSignedOffsetByte(this.fetch());
      this.registers.pc = (this.registers.pc + offset) & 0xffff;
      this.clocks.m = 3;
      this.clocks.t = 12;
    } else {
      this.registers.pc = (this.registers.pc + 1) & 0xffff;
      this.clocks.m = 2;
      this.clocks.t = 8;
    }
  }

  /**
   * Decimal Adjust Accumulator (DAA).
   * Adjusts the value in the A register to ensure it is a valid Binary-Coded Decimal (BCD) value.
   * This is typically used after addition or subtraction operations.
   *
   * Flags affected:
   * - Z (Zero): Set if the result in A is 0.
   * - N (Subtract): Unchanged.
   * - H (Half Carry): Cleared.
   * - C (Carry): Set or cleared based on the adjustment.
   *
   * Clock cycles: 4
   */
  private daa() {
    let correction = 0;
    const isNegative = (this.registers.f & 0x40) !== 0;

    if (
      (this.registers.f & 0x20) !== 0 ||
      (!isNegative && (this.registers.a & 0x0f) > 9)
    ) {
      correction |= 0x06;
    }

    if (
      (this.registers.f & 0x10) !== 0 ||
      (!isNegative && this.registers.a > 0x99)
    ) {
      correction |= 0x60;
      this.setFlag("C", true);
    } else {
      this.setFlag("C", false);
    }

    this.registers.a = isNegative
      ? (this.registers.a - correction) & 0xff
      : (this.registers.a + correction) & 0xff;

    this.setFlag("Z", this.registers.a === 0);
    this.setFlag("H", false);
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * Complement Carry Flag (CCF).
   * Flips the current state of the Carry (C) flag.
   * Clears the Subtract (N) and Half Carry (H) flags.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Cleared to 0.
   * - H (Half Carry): Cleared to 0.
   * - C (Carry): Complemented.
   *
   * Clock cycles: 4
   */
  private ccf() {
    const carry = (this.registers.f & 0x10) === 0; // true if C is 0, false if C is 1
    this.setFlag("N", false); // Clear Subtract flag
    this.setFlag("H", false); // Clear Half Carry flag
    this.setFlag("C", carry); // Complement Carry flag
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * Complement (invert) all bits in the A register.
   * This operation flips each bit in the A register (1 becomes 0, and 0 becomes 1).
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Set to 1.
   * - H (Half Carry): Set to 1.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private cpl() {
    this.registers.a = this.registers.a ^ 0xff;
    this.setFlag("N", true);
    this.setFlag("H", true);
    this.clocks.m = 1;
    this.clocks.t = 4;
  }

  /**
   * Set Carry Flag (SCF).
   * Sets the Carry (C) flag to 1 and clears the Subtract (N) and Half Carry (H) flags.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Cleared to 0.
   * - H (Half Carry): Cleared to 0.
   * - C (Carry): Set to 1.
   *
   * Clock cycles: 4
   */
  private scf() {
    this.setFlag("C", true); // Set Carry flag
    this.setFlag("N", false); // Clear Subtract flag
    this.setFlag("H", false); // Clear Half Carry flag
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * STOP (0x10)
   * Puts the CPU into a very low-power state until a button is pressed or a reset occurs.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private stop() {
    this.stopped = true; // You should have a 'stopped' property in your CPU class
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  /**
   * HALT (0x76)
   * Halts the CPU until an interrupt occurs.
   *
   * Flags affected:
   * - Z (Zero): Unaffected.
   * - N (Subtract): Unaffected.
   * - H (Half Carry): Unaffected.
   * - C (Carry): Unaffected.
   *
   * Clock cycles: 4
   */
  private halt() {
    this.halted = true; // You should have a 'halted' property in your CPU class
    this.clocks.m = 1; // 4 clock cycles
    this.clocks.t = 4;
  }

  private fetchWord() {
    const lowByte = this.memory.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xff;
    const highByte = this.memory.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xff;
    return (highByte << 8) | lowByte;
  }

  private getSignedOffsetByte(value: number) {
    value &= 0xff;
    // We don't have to do anything if the value is positive.
    if (value & 0x80) {
      value = -((0xff & ~value) + 1);
    }
    return value;
  }

  private setFlag(flag: string, value: boolean): void {
    const flagBits: { [key: string]: number } = {
      Z: 7, // Zero flag
      N: 6, // Subtract flag
      H: 5, // Half Carry flag
      C: 4, // Carry flag
    };

    const flagBit = flagBits[flag];

    if (flagBit === undefined) {
      throw new Error(`Unknown flag: ${flag}`);
    }

    if (value) {
      this.registers.f |= 1 << flagBit;
    } else {
      this.registers.f &= ~(1 << flagBit);
    }
  }

  public disassembleInstruction(address: number): string {
    // Conver instruction to disassemble version
    return ``;
  }

  public printRegisters() {
    return (
      `{\n` +
      `\ta: ${this.registers.a}` +
      `\tb: ${this.registers.b}` +
      `\tc: ${this.registers.c}` +
      `\td: ${this.registers.d}` +
      `\te: ${this.registers.e}` +
      `\tf: ${this.registers.f}` +
      `\th: ${this.registers.h}` +
      `\tl: ${this.registers.l}` +
      `}`
    );
  }

  public printCallStack() {
    // Get call stack and print here
  }

  public getPC() {
    return this.registers.pc;
  }
}
