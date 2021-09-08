import { JaegerExporter, ExporterConfig } from '@opentelemetry/exporter-jaeger'; // eslint-disable-line no-unused-vars
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { ConsoleSpanExporter, SpanExporter } from '@opentelemetry/tracing'; // eslint-disable-line no-unused-vars

const DEFAULT_SERVICE_NAME = 'appium';

const AVAILABLE_EXPORTERS = {
  JAEGER: 'jaeger',
  ZIPKIN: 'zipkin',
  PROMETHEUS: 'prometheus',
  CONSOLE: 'console'
};

/**
 * factory to create exporter instance for a given exporter type and optional config
 * @param {string} exporterType
 * @param {?ExporterConfig} config
 * @return {SpanExporter}
 * @throws Will throw an error if the exporterType is invalid or null
*/
function buildExporter (exporterType, config = null) {
  switch (exporterType) {
    case AVAILABLE_EXPORTERS.JAEGER:
      return new JaegerExporter(config || { serviceName: DEFAULT_SERVICE_NAME });
    case AVAILABLE_EXPORTERS.ZIPKIN:
      return new ZipkinExporter(config || { serviceName: DEFAULT_SERVICE_NAME });
    case AVAILABLE_EXPORTERS.PROMETHEUS:
      return new PrometheusExporter(config || {});
    case AVAILABLE_EXPORTERS.CONSOLE:
      return new ConsoleSpanExporter();
  }
  throw new Error(`Unsupported exporter type - ${exporterType}, Supported types ${Object.keys(AVAILABLE_EXPORTERS)}`);
}

export { buildExporter, AVAILABLE_EXPORTERS };