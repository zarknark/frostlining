import $ from 'jquery';
import _ from 'underscore';
import Parser from "./passage/Parser.js";
import Renderer from "./passage/Renderer.js";

export default class Passage {

  constructor(
      id,
      name,
      tags,
      rawSource,
      parser = new Parser(),
      renderer = new Renderer()
  ) {
    /**
  	 The numeric ID of the passage.
  	 @property name
  	 @type Number
  	 @readonly
  	**/

    this.id = id || 1;

    /**
  	 The name of the passage.
  	 @property name
  	 @type String
  	**/

    this.name = name || "Default";

    /**
  	 The tags of the passage.
  	 @property tags
  	 @type Array
  	**/

    this.tags = tags || [];

    /**
  	 The passage source code.
  	 @property source
  	 @type String
  	**/

    this.rawSource = rawSource;

    /**
     The passage source after running it through the Frostlining compiler.
     @property source
     @type String
     **/

    this.templatedSource = "";

    /**
     The Parser object used to generate the templatedSource string from the rawSource string.
     @property parser
     @type String
     **/

    this.parser = parser;

    /**
     The Renderer object used to generate the templatedSource string from the rawSource string.
     @property renderer
     @type String
     **/

    this.renderer = renderer;
  }

  /**
   * Renders the passage content.
   * Uses Underscore's template function to process any embedded JavaScript.
   * Uses markdown-it to convert Markdown to HTML.
   * @param {string} source.
   * @returns {string} HTML content.
   */
  render(source) {

    let renderingExternal = (source !== undefined && source !== null);

    let templatedSource;
    if (renderingExternal || this.templatedSource === "" ) {
      source = (renderingExternal) ? source : _.unescape(this.rawSource);
      try {
        let tokens = this.parser.tokenize(source);
        let ast = this.parser.toAst(tokens);

        templatedSource = this.renderer.astToPassageTemplate(ast);
      } catch (error) {
        $.event.trigger('sm.story.error', [error, "Passage.render() while compiling Underscore template."]);
      }

      if (!renderingExternal) this.templatedSource = templatedSource;

    } else {
      templatedSource = this.templatedSource;
    }

    try {
      return _.template(templatedSource)({ s: window.story.state, $: $ });
    } catch(error) {
      $.event.trigger('sm.story.error', [error, "Passage.render() using _.template()"]);
      return "";
    }
  }
}
