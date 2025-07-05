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
