/*
 * Filename: c:/Users/brian/workspace/gboy-learning/src/web/emulator/memory.ts
 * Path: c:/Users/brian/workspace/gboy-learning
 * Created Date: Saturday, March 22nd 2025, 12:41:25 pm
 * Author: Brian Ignacio
 * 
 * Copyright (c) 2025 Your Company
 */

export class Memory {
  private memory: Uint8Array;

  constructor(size: number) {
    this.memory = new Uint8Array(size);
  }

  public readByte(address: number) {
    return this.memory[address];
  }

  public writeByte(address: number, value: number) {
    this.memory[address] = value;
  }
}