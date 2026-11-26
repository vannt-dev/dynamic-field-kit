#!/usr/bin/env node
import { runStdioServer } from './server';

// stdout carries the protocol; anything else must go to stderr.
void runStdioServer(process.stdin, process.stdout);
