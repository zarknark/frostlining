export default class Renderer {

  debugMode = false;
  debugCounter = 0;

  // Traverses AST to produce a source string that can be used
  // with the Underscore's .template() function.
  astToPassageTemplate(ast) {

    if (ast.type !== 'Passage') {
      throw "Error: passageToTemplate() must take a 'Passage' node."
    }

    let source = ast.children.reduce((source, child) => {
      let childSource = this.walk(child);

      if (source.length > 0) {
        let spacer = ' ';
        if (source.endsWith("\n") ||
            childSource.startsWith("\n") ||
            (source.endsWith(">") && source.startsWith("<"))) {
          spacer = '';
        }
        return `${source}${spacer}${childSource}`;
      } else {
        return childSource;
      }
    }, "");

    return source.replace(/> ([.,;:'"])/g, ">$1");
  }

  walk(astNode) {
    let getChildrenSource = (source, child) => {
      let childSource = this.walk(child);
      if (source.length > 0) {
        let spacer = ' ';
        if (source.endsWith("\n") ||
            childSource.startsWith("\n") ||
            (source.endsWith(">") && source.startsWith("<"))) {
          spacer = '';
        }
        return `${source}${spacer}${childSource}`;
      } else {
        return childSource;
      }
    };

    switch (astNode.type) {
      case 'UnderscoreTemplate': {
        let templateValue = astNode.children.reduce(getChildrenSource, "");
        return `<% ${templateValue} %>`;
      }
      case 'UnderscoreInterpolate': {
        let templateValue = astNode.children.reduce(getChildrenSource, "");
        return `<%= ${templateValue} %>`;
      }
      case 'UnderscoreInterpolateEscaped': {
        let templateValue = astNode.children.reduce(getChildrenSource, "");
        return `<%- ${templateValue} %>`;
      }
      case 'TwineLink': {

        let passageSrc = astNode.passage.reduce(getChildrenSource, "");
        let labelSrc = astNode.label.reduce(getChildrenSource, "");
        let labelValue = labelSrc.length > 0 ? labelSrc : passageSrc;

        let linkTemplate;
        if (astNode.isEmbed) {
          linkTemplate = `<a href="javascript:void(0)" data-passage="${passageSrc}" is-embed=true>${labelValue}</a>`;
        } else {
          linkTemplate = `<a href="javascript:void(0)" data-passage="${passageSrc}">${labelValue}</a>`;
        }

        return linkTemplate;
      }
      case 'FrostliningInterpolate':
        return `<%= ${astNode.value} %>`;
      case `FrostliningConditional`: {
        let ifSource = astNode.ifChildren.reduce(getChildrenSource, "");
        let source = `<% if (${astNode.conditional}) { %>${ifSource}<% }`;

        let elseSource = astNode.elseChildren.reduce(getChildrenSource, "");
        if (elseSource.length > 0) {
          source += ` else { %>${elseSource}<% } %>`;
        } else {
          source += " %>";
        }

        return source;
      }
      case `FrostliningHtmlShorthand` : {
        let idSource = (astNode.id.length > 0) ? `id="${astNode.id}"` : "";
        let classSource = (astNode.classes.length > 0) ? `class="${astNode.classes.join(' ')}"`: "";
        let childrenSource = astNode.children.reduce(getChildrenSource, "");

        let trailingSource = "";
        if (idSource.length > 0) trailingSource += ` ${idSource}`;
        if (classSource.length > 0) trailingSource += ` ${classSource}`;

        return `<${astNode.tag}${trailingSource}> ${childrenSource} </${astNode.tag}>`
      }
      case `FrostliningFootnote` : {
        let labelSource = astNode.label.reduce(getChildrenSource, "");
        let childrenSource = astNode.children.reduce(getChildrenSource, "");
        let labelId = this.cssId();

        return (
            `<span id="${labelId}" class="footnote-label">${labelSource}</span>` +
            `<span id="${labelId}-footnote" class="footnote fl-hidden">${childrenSource}</span>` +
            `<script>$("#${labelId}").on("click",toggleFootnote)</script>`
        );
      }
      case 'Source':
      case 'Newline':
        return astNode.value;
      default:
        throw `Unknown node type '${astNode.type}' encountered when rendering AST.`
    }
  }


  cssId () {
    if (this.debugMode) {
      return `id-${this.debugCounter++}`;
    } else {
      return Math.random().toString(36).replace(/^0\./, '_')
    }
  }

}

