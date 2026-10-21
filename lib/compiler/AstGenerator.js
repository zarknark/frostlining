export default class AstGenerator {

  generateAst(tokens) {

    let currentPos = 0;

    function walk(depth = 1) {

      if (currentPos >= tokens.length) {
        if (depth !== 0 ) {
          throw 'ERROR: end of token stream reached and depth is not 0!';
        }
        return null;
      }
      let token = tokens[currentPos];

      switch (token.type) {
        case 'underscore-interp-start':
        case 'underscore-interp-esc-start':
        case 'underscore-start': {
          let utType = "UnderscoreTemplate";
          if (token.type === 'underscore-interp-start') {
            utType = "UnderscoreInterpolate";
          } else if (token.type === "underscore-interp-esc-start") {
            utType = "UnderscoreInterpolateEscaped";
          }

          token = tokens[++currentPos];

          let node = {
            type: utType,
            children: []
          }

          while (currentPos < tokens.length && token.type !== 'underscore-end') {
            node.children.push(walk());
            token = tokens[currentPos];
          }

          currentPos += 1;

          return node;
        }
        case 'tw-link-start': {
          token = tokens[++currentPos];

          let node = {
            type: 'TwineLink',
            label: [],
            passage: [],
            isEmbed: false
          }

          let separator=''
          let leftChildren = []
          let rightChildren = []

          while (token.type !== 'tw-link-end') {
            if (separator === '') {
              if (['pipe', 'arrow', 'rev-arrow'].includes(token.type)) {
                separator = token.type;
                token = tokens[++currentPos];
              } else {
                leftChildren.push(walk());
                token = tokens[currentPos];
              }
            } else {
              rightChildren.push(walk());
              token = tokens[currentPos];
            }
          }

          if (rightChildren.length === 0) {
            node.passage = leftChildren;
          } else {
            node.isEmbed = separator === 'rev-arrow';
            if (node.isEmbed) {
              node.label = rightChildren;
              node.passage = leftChildren;
            } else {
              node.label = leftChildren;
              node.passage = rightChildren;
            }
          }

          currentPos += 1;

          return node;
        }
        case 'fl-variable': {
          token = tokens[++currentPos];

          if (token.type !== 'word') {
            throw "ERROR: '<|' should always be immediately followed by a variable name"
          }

          currentPos += 1;

          return {
            type: 'FrostliningInterpolate',
            value: token.value
          }
        }
        case 'fl-conditional-start': {

          let node = {
            type: 'FrostliningConditional',
            conditional: token.value,
            ifChildren: [],
            elseChildren: []
          }

          token = tokens[++currentPos];

          let pipeCharFound = false;
          while (token.type !== 'fl-conditional-end') {
            if (!pipeCharFound) {
              if (token.type !== 'pipe') {
                node.ifChildren.push(walk());
                token = tokens[currentPos];
              } else {
                pipeCharFound = true;
                token = tokens[++currentPos];
              }
            } else {
              node.elseChildren.push(walk());
              token = tokens[currentPos];
            }
          }

          currentPos += 1;

          return node;
        }
        case 'fl-html-start': {

          let node = {
            type: 'FrostliningHtmlShorthand',
            tag: '',
            id: '',
            classes: [],
            children: [],
            javascriptVoid: false
          }

          // break down token into tag, id, and classes
          const htmlString = token.value;
          const tokenSplit = htmlString.split(/[.#]/)


          tokenSplit.forEach((element, index) => {
            if (index === 0) {

              // if this is completely empty, the tag defaults to 'p'
              if (element.length === 0) {
                node.tag = 'p';
              } else {

                if (element.includes("0")) {
                  node.javascriptVoid = true;
                }

                if (element.includes("-")) {
                  node.classes.push('fl-hidden');
                }

                node.tag = element.replaceAll(/[0-]/g, "");
              }


              return;
            }

            if (element.trim().length === 0) {
              throw `Error: HTML-shorthand ${htmlString} cannot have an empty class or id`
            }
            if (index === 0) {
              node.tag = element;
            } else {
              if (token.value.includes(`.${element}`) && !node.classes.includes(element)) {
                node.classes.push(element);
              }
              if (token.value.includes(`#${element}`)) {
                if (node.id !== '') {
                  throw `Error: HTML-shorthand ${htmlString} cannot have more than one defined id`;
                }
                node.id = element;
              }
            }
          });

          token = tokens[++currentPos];

          // if the next token is a word, add it by itself to the children
          // and return.
          if (token.type === 'word') {
            node.children.push({
              type: 'Source',
              value: token.value
            });

            currentPos += 1;

            return node;
          }

          // Otherwise, look for the ending tag.
          while (token.type !== 'fl-html-end') {
            node.children.push(walk());
            token = tokens[currentPos];
          }

          currentPos += 1;
          return node;
        }
        case 'fl-footnote-start': {
          token = tokens[++currentPos];

          let node = {
            type: 'FrostliningFootnote',
            label: [],
            children: []
          };

          let pipeCharFound = false;
          while (token.type !== 'fl-footnote-end') {
            if (!pipeCharFound) {
              if (token.type !== 'pipe') {
                node.label.push(walk());
                token = tokens[currentPos];
              } else {
                pipeCharFound = true;
                token = tokens[++currentPos];
              }
            } else {
              node.children.push(walk());
            }
            token = tokens[currentPos];
          }

          currentPos += 1;
          return node;
        }
        case 'sq-bracket-open': {
          currentPos += 1;
          token = tokens[currentPos];

          let node = {
            type: 'BracketedText',
            children: []
          }

          while (token.type !== 'sq-bracket-closed') {
            node.children.push(walk());
            token = tokens[currentPos];
          }

          currentPos += 1;

          return node;
        }
        case 'source':
        case 'word': {
          let node = {
            type: 'Source',
            value: token.value,
          }

          currentPos += 1;
          token = tokens[currentPos];

          while (currentPos < tokens.length && (token.type === 'word' || token.type === 'source')) {
            node.value += ` ${token.value}`;
            currentPos += 1;
            token = tokens[currentPos];
          }

          return node;
        }
        case 'newline': {
          currentPos += 1;

          return {
            type: 'Newline',
            value: '\n'
          }
        }
        case 'pipe': {
          currentPos += 1;

          return {
            type: 'Source',
            value: '|'
          };
        }
        case 'fl-glue': {
          currentPos += 1;
          return {
            type: 'Glue',
            value: '<>'
          };
        }
        case 'fl-whitespace': {
          currentPos += 1;

          return {
            type: 'Source',
            value: token.value
          };
        }
        default:
          if (token) {
            throw `Error: Unexpected token '${token.type}' at line ${token.pos[0]}, column ${token.pos[1]}.`;
          } else {
            throw `Undefined token encountered -- currentPos=${currentPos}, tokens.length=${tokens.length}`;
          }
      }
    }

    let ast = {
      type: 'Passage',
      children: [],
    };

    while (currentPos < tokens.length) {
      let node = walk(0);
      if (node != null) {
        ast.children.push(node);
      }
    }

    return ast;
  }


}