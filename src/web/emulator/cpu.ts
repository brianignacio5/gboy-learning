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
  public clocks: IClocks = {
    m: 0,
    t: 0,
  };
  public halted: boolean;
  private instructions: { [opcode: number]: () => void };

  constructor() {
    this.instructions = this.initializeInstructions();
    this.halted = false;
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
    // Add more instructions...
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
    instructions[0x22] = this.ldHL_A;
    instructions[0x23] = this.incHL;
    instructions[0x24] = this.incH;
    instructions[0x25] = this.decH;
    instructions[0x26] = this.ldH_d8;
    instructions[0x27] = this.daa;
    instructions[0x28] = this.jrZ_r8;
    instructions[0x29] = this.addHLHL;
    instructions[0x2a] = this.ldA_HL;
    instructions[0x2b] = this.decHL;
    instructions[0x2c] = this.incL;
    instructions[0x2d] = this.decL;
    instructions[0x2e] = this.ldL_d8;
    instructions[0x2f] = this.cpl;
    instructions[0x30] = this.jrNC_r8;
    instructions[0x31] = this.ldSP_d16;
    instructions[0x32] = this.ldHL_A;
    instructions[0x33] = this.incSP;
    instructions[0x34] = this.incHL;
    instructions[0x35] = this.decHL;
    instructions[0x36] = this.ldHL_d8;
    instructions[0x37] = this.scf;
    instructions[0x38] = this.jrC_r8;
    instructions[0x39] = this.addHLSP;
    instructions[0x3a] = this.ldA_HL;
    instructions[0x3b] = this.decSP;
    instructions[0x3c] = this.incA;
    instructions[0x3d] = this.decA;
    instructions[0x3e] = this.ldA_d8;
    instructions[0x3f] = this.ccf;
    instructions[0x40] = this.ldB_B;
    instructions[0x41] = this.ldB_C;
    instructions[0x42] = this.ldB_D;

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

  private ldB_d8() {
    const value = this.fetch();
    this.registers.b = value;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  private ldC_d8() {
    const value = this.fetch();
    this.registers.c = value;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  private ldD_d8() {
    const value = this.fetch();
    this.registers.d = value;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  private ldE_d8() {
    const value = this.fetch();
    this.registers.e = value;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

  private ldH_d8() {
    const value = this.fetch();
    this.registers.h = value;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

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

  private ldHL_A() {
    this.memory.writeByte(this.registers.hl, this.registers.a);
    this.registers.hl = (this.registers.hl + 1) & 0xffff;
    this.clocks.m = 2;
    this.clocks.t = 8;
  }

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

  private ldA_HL() {
    this.registers.a = this.memory.readByte(this.registers.hl);
    this.registers.hl = (this.registers.hl + 1) & 0xffff;
    this.clocks.m = 2;
    this.clocks.t = 8;
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

  private incHL() {
    this.registers.hl = (this.registers.hl + 1) & 0xffff;
    this.clocks.m = 2;
    this.clocks.t = 8;
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

  private decHL() {
    this.registers.hl = (this.registers.hl - 1) & 0xffff;
    this.clocks.m = 2;
    this.clocks.t = 8;
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

  private stop() {
    this.halted = true;
    this.clocks.m = 1;
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
