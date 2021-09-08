import { getBatchSpanProcessor } from './spanProcessorFactory';
import { buildExporter, AVAILABLE_EXPORTERS } from './exporterFactory';
import { NodeTracerProvider } from '@opentelemetry/node';
import { registerInstrumentations, InstrumentationOption } from '@opentelemetry/instrumentation'; // eslint-disable-line no-unused-vars
import { ServerInstrumentation } from './serverInstrumenation';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { SpanProcessor, SpanExporter } from '@opentelemetry/tracing'; // eslint-disable-line no-unused-vars
import { ExporterConfig } from '@opentelemetry/exporter-jaeger'; // eslint-disable-line no-unused-vars
import _ from 'lodash';
import { forEachPromise } from '../utils';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const DEFAULT_SERVICE_NAME = 'appium';

//Delegate
class TracerProvider {
  constructor (serviceName = DEFAULT_SERVICE_NAME) {
    this.provider = new NodeTracerProvider({
        resource: new Resource({ [SemanticResourceAttributes.SERVICE_NAME]: serviceName }),
    });
    this.exporterInstances = {};
    this._currentConfig = {
      active: true,
      exporterConfigs: []
    };
    this.init();
  }

  init () {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ALL);
    this.provider.register();

    this._serverInstrumentation = new ServerInstrumentation();
    registerInstrumentations({
      instrumentation: this._serverInstrumentation.instrumentations,
      tracerProvider: this.provider
    });

    this.registerExporter({
      exporterType: AVAILABLE_EXPORTERS.CONSOLE
    });
  }

  get currentConfig () {
    return _.cloneDeep(this._currentConfig);
  }


  /**
   * @typedef {Object} Exporter
   * @property {string} exporterType - exporterType of the exporter
   * @property {ExporterConfig} config - config for that specific exporterType
   */
  /**
   * adds exporterInstance and exporterConfig to currentConfig
   * @param {SpanExporter} exporterInstance SpanExporter instance object
   * @param {Exporter} exporterConfig exporter object with exporterType and config
   */
  addExporter (exporterInstance, exporterConfig) {
    this.exporterInstances[exporterConfig.exporterType] = exporterInstance;
    this._currentConfig.exporterConfigs.push(exporterConfig);
  }

  /**
   * generates a span processor for exporter object containing a type and config
   * @param {Exporter} exporterConfig exporter object with exporterType and config
   */
  registerExporter (exporterConfig) {
    const exporterInstance = buildExporter(exporterConfig.exporterType, exporterConfig.config);
    const spanProcessor = getBatchSpanProcessor(exporterInstance);
    this.addSpanProcessor(spanProcessor);
    this.addExporter(exporterInstance, exporterConfig);
  }

  /**
   * adds a spanprocessor object to the current active (default) TracerProvider
   * @param {SpanProcessor} spanProcessor spanProcessor to be added to current tracerProvider
   */
  addSpanProcessor (spanProcessor) {
    this.provider.addSpanProcessor(spanProcessor);
  }

  /**
   * adds an instrumentation object to the current active (default) TracerProvider
   * @param {InstrumentationOption} instrumentationInstance  instrumentation object
   */
  registerInstrumentation (instrumentationInstance) {
    registerInstrumentations({
      instrumentation: [instrumentationInstance],
      provider: this.provider
    });
  }

  /**
   * disables existing exporter if active
   * @param {string} exporterType exporter types from AVAILABLE_EXPORTERS
   */
  async disableExporter (exporterType) {
    if (this.exporterInstances[exporterType]) {
      try {
        await this.exporterInstances[exporterType].shutdown();
      } catch (error) {} finally {
        delete this.exporterInstances[exporterType];
      }
    }
    this._currentConfig.exporterConfigs = this._currentConfig.exporterConfigs.filter((item) => item.exporterType !== exporterType);
  }

  /**
   * disables the current tracer provider and all its associated exporters
   */
  async shutdown () {
    this._currentConfig.active = false;
    await this.disableAllExporters();
  }

  /**
   * checks if the current tracer provider is active
   */
  isAlive () {
    return this.currentConfig.active;
  }

  /**
   * registers the current tracer provider as the active tracer provider with the api
   */
  initializeTracer () {
    this.provider.register();
  }

  /**
   * resets the current active tracer provider to its original state
   */
  async reset () {
    await this.disableAllExporters();
    this.registerExporter({
      exporterType: AVAILABLE_EXPORTERS.CONSOLE
    });
    this._currentConfig.active = true;
  }

  /**
   * disables all exporters associated with the current active tracer provider
   */
  async disableAllExporters () {
    const exporterList = Object.keys(this.exporterInstances);
    await forEachPromise(exporterList, async (exporterType) => {
      await this.disableExporter(exporterType);
    });
  }
}

const tracerProviderInstance = new TracerProvider();
export { tracerProviderInstance };