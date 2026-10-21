import $ from 'jquery';
import _ from 'underscore';
import Compiler from "./compiler/Compiler.js";

export default class Passage {

  constructor(
      id,
      name,
      tags,
      rawSource,
      compiler = new Compiler()
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
     The Compiler object used to generate the templatedSource string from the rawSource string.
     @property parser
     @type Compiler
     **/

    this.compiler = compiler;
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
        templatedSource = this.compiler.process(source);
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
