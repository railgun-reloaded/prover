/**
 * Type declarations for the brittle test framework.
 */

interface CoercibleAssertion {
  (actual: unknown, expected: unknown, message?: string): void;
  coercively(actual: unknown, expected: unknown, message?: string): void;
}

type AnyErrorConstructor = new () => Error

interface ExceptionAssertion {
  (fn: Promise<unknown> | (() => Promise<unknown>), message?: string): Promise<void>;
  (
    fn: Promise<unknown> | (() => Promise<unknown>),
    error?: RegExp | AnyErrorConstructor,
    message?: string,
  ): Promise<void>;
  (fn: () => unknown, message?: string): void;
  (fn: () => unknown, error?: RegExp | AnyErrorConstructor, message?: string): void;
  all(fn: Promise<unknown> | (() => Promise<unknown>), message?: string): Promise<void>;
  all(
    fn: Promise<unknown> | (() => Promise<unknown>),
    error?: RegExp | AnyErrorConstructor,
    message?: string,
  ): Promise<void>;
  all(fn: () => unknown, message?: string): void;
  all(fn: () => unknown, error?: RegExp | AnyErrorConstructor, message?: string): void;
}

/**
 * The assertion object passed to each test callback.
 */
interface TestInstance {
  /** Assert strict equality. */
  is: CoercibleAssertion;
  /** Assert strict inequality. */
  not: CoercibleAssertion;
  /** Assert deep equality. */
  alike: CoercibleAssertion;
  /** Assert deep inequality. */
  unlike: CoercibleAssertion;
  /**
   * Assert that value is truthy.
   * @param value - The value to check.
   * @param message - Optional assertion message.
   */
  ok(value: unknown, message?: string): void;
  /**
   * Assert that value is falsy.
   * @param value - The value to check.
   * @param message - Optional assertion message.
   */
  absent(value: unknown, message?: string): void;
  /**
   * Pass unconditionally.
   * @param message - Optional message.
   */
  pass(message?: string): void;
  /**
   * Fail unconditionally.
   * @param message - Optional message.
   */
  fail(message?: string): void;
  /** Assert that a function throws. */
  exception: ExceptionAssertion;
  /**
   * Assert that a function executes without throwing.
   * @param fn - The function to execute.
   * @param message - Optional message.
   */
  execution<T>(fn: T | Promise<T>, message?: string): Promise<number>;
  /**
   * Plan the number of assertions.
   * @param n - Expected assertion count.
   */
  plan(n: number): void;
  /**
   * Register a teardown callback.
   * @param fn - Teardown function.
   * @param options - Optional options.
   * @param options.order - Teardown order priority.
   */
  teardown(fn: () => unknown | Promise<unknown>, options?: { order?: number }): void;
  /**
   * Set a timeout for the test.
   * @param ms - Timeout in milliseconds.
   */
  timeout(ms: number): void;
  /**
   * Emit a TAP comment.
   * @param message - The comment text.
   */
  comment(message: string): void;
  /** Signal test completion when not using plan(). */
  end(): void;
  /** Nested test function. */
  test: TestFn;
}

/**
 * Options for configuring a test.
 */
interface TestOptions {
  /** Timeout in milliseconds. */
  timeout?: number;
  /** Run only this test. */
  solo?: boolean;
  /** Skip this test. */
  skip?: boolean;
  /** Mark as a future test. */
  todo?: boolean;
}

/**
 * The test function signature.
 */
interface TestFn {
  (name: string, options: TestOptions, callback: (t: TestInstance) => void | Promise<void>): Promise<void>;
  (name: string, callback: (t: TestInstance) => void | Promise<void>): Promise<void>;
  (callback: (t: TestInstance) => void | Promise<void>): Promise<void>;
  (name: string, options: TestOptions): TestInstance;
  (name: string): TestInstance;
  (): TestInstance;
}

/**
 * Top-level test function with solo/skip variants.
 */
interface Test extends TestFn {
  /** Nested test function. */
  test: Test;
  /** Run only matching tests. */
  solo: TestFn;
  /** Skip matching tests. */
  skip: TestFn;
  /**
   * Configure default test options.
   * @param options - The options to apply.
   */
  configure(options: TestOptions): void;
}

declare module 'brittle' {
  const test: Test
  const hook: TestFn
  export { test, hook }
}
