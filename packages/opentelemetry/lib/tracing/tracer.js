import TraceAPI, {SpanStatusCode, SpanOptions, setSpan } from '@opentelemetry/api'; // eslint-disable-line no-unused-vars
import { Span } from '@opentelemetry/tracing'; // eslint-disable-line no-unused-vars

class Tracer {

  constructor (tracerProviderInstance, name, options = {}) {
    this._tracerProvider = tracerProviderInstance;
    const { version } = options;
    this._tracer = TraceAPI.trace.getTracer(name, version);
  }

  /**
   * creates a span object with optional parent span and optional span options
   * @param {string} name  name of the span
   * @param {?Span} parentSpan (Optional) parentSpan to get context from
   * @param {?SpanOptions} spanOptions (Optional) span options
   * @return {Span}
   */
  createSpanObject (name, parentSpan = null, spanOptions = null) {
    //TODO - verify setting context from parentSpan
    const context = parentSpan ? parentSpan.context() : TraceAPI.context.active();
    const span = this._tracer.startSpan(name, spanOptions, context);
    setSpan(context, span);
    return span;
  }

  /**
   * monkeypatches argument async function to instrument it via a span object
   * @param {string} name  name of the span
   * @param {Function} fn original function to monkeypatch
   * @param {?Span} parentSpan (Optional) parentSpan to get context from
   * @param {?SpanOptions} spanOptions (Optional) span options
   * @return {Function}
   */
  instrumentAsyncMethod (name, fn, parentSpan = null, spanOptions = null) {
    const spannerFunction = async (...args) => {
      const span = this.createSpanObject(name, parentSpan, spanOptions);
      try {
        return await fn.call(...args);
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message
        });
        throw error;
      } finally {
        span.end();
      }
    };
    return spannerFunction;
  }

  /**
  * monkeypatches argument function to instrument it via a span object
  * @param {string} name  name of the span
  * @param {Function} fn original function to monkeypatch
  * @param {?Span} parentSpan (Optional) parentSpan to get context from
  * @param {?SpanOptions} spanOptions (Optional) span options
  * @return {Function}
  */
  instrumentMethod (name, fn, parentSpan = null, spanOptions = null) {
    const spannerFunction = (...args) => {
      const span = this.createSpanObject(name, parentSpan, spanOptions);
      try {
        return fn.call(...args);
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message
        });
        throw error;
      } finally {
        span.end();
      }
    };
    return spannerFunction;
  }

  get tracerInstance () {
    return this._tracer;
  }
}

export { Tracer };

