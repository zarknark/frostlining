export default class Parser {

  workingText = ''

  INLINE_WS=/[ \t]/;
  NEWLINE_WS=/[\r\n]/;
  SHORTHAND_CHARS = /[A-Za-z-_.# ]/

  /// AST GENERATOR
  toAst(tokens) {

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
          token = tokens[++currentPos];

          let utType = "UnderscoreTemplate";
          if (token.type === 'underscore-interp-start') {
            utType = "UnderscoreInterpolate";
          } else if (token.type === "underscore-interp-esc-start") {
            utType = "UnderscoreInterpolateEscaped";
          }

          let node = {
            type: utType,
            children: []
          }

          while (token.type !== 'underscore-end') {
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
              while (!['pipe', 'arrow', 'rev-arrow'].includes(token.type)) {
                leftChildren.push(walk());
                token = tokens[currentPos];
              }
              separator = token.type;
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
            throw "ERROR: '<|' should always be followed by a variable name"
          }

          return {
            type: 'FrostliningInterpolate',
            var_name: token.value
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
              while (token.type !== 'pipe') {
                node.ifChildren.push(walk());
                token = tokens[currentPos];
              }
              pipeCharFound = true;
            } else {
              node.elseChildren.push(walk());
              token = tokens[currentPos];
            }
          }

          return node;
        }
        case 'fl-html-start': {

          let node = {
            type: 'FrostliningHtmlShorthand',
            tag: '',
            id: '',
            classes: [],
            children: []
          }

          // break down token into tag, id, and classes
          const htmlString = token.value;
          const tokenSplit = htmlString.split(/\.#/)

          // if this is completely empty, the tag defaults to 'p'
          if (tokenSplit.length === 0) {
            node.tag = 'p';
          } else {
            tokenSplit.forEach((element, index) => {
              if (element.trim().length === 0) {
                throw `Error: HTML-shorthand ${htmlString} cannot have an empty class or id`
              }
              if (index === 0) {
                node.tag = element;
              } else {
                if (token.value.includes(`.${element}`)) {
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
          }

          token = tokens[++currentPos];

          // if the next token is a word, we can return immediately.
          if (token.type === 'word') {
            node.children.push(walk());
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
            children: []
          };

          while (token.type !== 'fl-footnote-end') {
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

          token = tokens[++currentPos];

          while (token.type === 'word' || token.type === 'source') {
            node.value += ` ${token.value}`;
            token = tokens[++currentPos];
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
        default:
          throw `Error: Unexpected token type '${token.type}'`
      }
    }

    let ast = {
      type: 'Passage',
      body: [],
    };

    while (currentPos < tokens.length) {
      let node = walk(0);
      if (node != null) {
        ast.body.push(node);
      }
    }

    return ast;
  }

  /// TOKENIZER & HELPERS

  tokenize(input) {
    if (typeof input != "string") {
      console.log("Parse error: non-string input")
      throw "ERROR: non-string input (Parser.tokenize)"
    }

    let currentPos = 0;
    let tokens = [];


    while (currentPos < input.length) {
      let char = input[currentPos];

      // newline handling
      if (this.NEWLINE_WS.test(char)) {
        this.pushToken(tokens, {type: 'newline', value: '\n'});

        currentPos += 1;
        continue;
      }

      /*
       * Possible opening template tag
       */
      if (char === '<') {
        if (currentPos + 1 < input.length) {
          let nextPos = currentPos + 1;
          let nextChar = input[nextPos];

          // Check for frostlining dialogue start: '<<<'
          if (nextChar === '<' && this.nextCharMatches('<', nextPos, input)) {
            this.pushToken(tokens, {type: 'fl-dialogue-start', value: '<<<'});
            currentPos += 3;
            continue;
          }
          // Check for frostlining var-substitution opening tag: '<|[var_name]'
          else if (nextChar === '|') {
            this.pushToken(tokens, {type: 'fl-variable', value: '<|'});
            currentPos += 2;
            currentPos = this.pushSourceUntil(/\s/, input, currentPos, tokens, 'word')
            continue;
          }
          // Check for frostlining conditional statement: '<? [JS_expr] ? [text] (| [text] ?>)'
          else if (nextChar === '?') {
            let conditionalEndPos = this.pushSourceUntil(/\?/, input, currentPos + 2, tokens, 'fl-conditional-start')
            if (conditionalEndPos !== currentPos) {
              currentPos = conditionalEndPos + 1;
              continue;
            }
          }
          // Check for HTML shorthand markup: '<:[fl-styling-names]: [text] (:>)'
          else if (nextChar === ':') {
            let shorthandEndPos = this.pushSourceUntil(/:/, input, currentPos + 2, tokens, 'fl-html-start');
            if (shorthandEndPos !== currentPos) {
              currentPos = shorthandEndPos + 1;
              currentPos = this.pushSourceUntil(/\s/, input, currentPos, tokens, 'word')
              continue;
            }
          }
          // Check for frostlining footnotes: '<& [text] | [text] &>
          else if (nextChar === '&') {
            this.pushToken(tokens, {type: 'fl-footnote-start', value: '<&'});
            currentPos += 2;
            continue;
          }
          // Check for frostlining glue: '<>'
          else if (nextChar === '>') {
            this.pushToken(tokens, {type: 'fl-glue', value: '<>'});
            currentPos += 2;
            continue;
          }
        }
      }

      // == Underscore tags
      // Opening tags
      if (char === '<' && this.nextCharMatches('%', currentPos, input)) {
        // interpolate tag
        if (this.nextCharMatches('=', currentPos + 1, input)) {
          this.pushToken(tokens, {type: "underscore-interp-start", value: "<%="});
          currentPos += 3;
          continue;
        }
        else if (this.nextCharMatches('-', currentPos + 1, input)) {
          this.pushToken(tokens, {type: "underscore-interp-esc-start", value: "<%-"});
          currentPos += 3;
          continue;
        }
        // basic '<%' opening tag
        else {
          this.pushToken(tokens, {type: "underscore-start", value: "<%"});
          currentPos += 2;
          continue;
        }
      }
      // closing '%>' tag
      if (char === '%' && this.nextCharMatches('>', currentPos, input)) {
        this.pushToken(tokens, {type: 'underscore-end', value: '%>'})
        currentPos += 2;
        continue;
      }

      // == Twine links
      if (char === '[') {
        if (this.nextCharMatches('[', currentPos, input)) {
          this.pushToken(tokens, {type: 'tw-link-start', value: '[['});
          currentPos += 2;
          continue;
        } else {
          this.pushToken(tokens, {type: 'sq-bracket-open', value: '['})
          currentPos += 1;
          continue;
        }
      }
      else if (char === ']') {
        if (this.nextCharMatches(']', currentPos, input)) {
          this.pushToken(tokens, {type: 'tw-link-end', value: ']]'});
          currentPos += 2;
          continue;
        } else {
          this.pushToken(tokens, {type: 'sq-bracket-closed', value: ']'})
          currentPos += 1;
          continue;
        }
      }
      else if (char === '-' && this.nextCharMatches('>', currentPos, input)) {
        this.pushToken(tokens, {type: 'arrow', value: '->'});
        currentPos += 2;
        continue;
      }
      else if (char === '<' && this.nextCharMatches('-', currentPos, input)) {
        this.pushToken(tokens, {type: 'rev-arrow', value: '<-'});
        currentPos += 2;
        continue;
      }

      // Note any pipe tokens -- relevant for frostling conditional statements
      if (char === '|') {
        this.pushToken(tokens, {type: 'pipe', value: '|'})
        currentPos += 1;
        continue;
      }

      // Note any double semicolons -- used to separate lines in dialogue sections
      if (char === ';' && this.nextCharMatches(';', currentPos, input)) {
        this.pushToken(tokens, {type: 'dialogue-break', value: ';;'})
        currentPos += 2;
        continue;
      }

      /*
       * Possible closing template tags
       */
      // Check for frostlining conditional:  '?>'
      if (char === '?' && this.nextCharMatches('>', currentPos, input)) {
        this.pushToken(tokens, {type: 'fl-conditional-end', value: '?>'})
        currentPos += 2;
        continue;
      }
      // Check for frostlining html-shorthand:  ':>'
      else if (char === ':' && this.nextCharMatches('>', currentPos, input)) {
        this.pushToken(tokens, {type: 'fl-html-end', value: ':>'})
        currentPos += 2;
        continue;
      }
      // check for frostlining footnotes: '&>'
      else if (char === '&' && this.nextCharMatches('>', currentPos, input)) {
        this.pushToken(tokens, {type: 'fl-footnote-end', value: '&>'});
        currentPos += 2;
        continue;
      }
      // Check for frostlining dialogue end: '>>>'
      if (char === '>' &&
          this.nextCharMatches('>', currentPos, input) &&
          this.nextCharMatches('>', currentPos + 1, input)) {
        this.pushToken(tokens, {type: 'fl-dialogue-end', value: '>>>'})
        currentPos += 3;
        continue;
      }

      // No matches found -- just append this to workingText
      this.workingText += char;
      currentPos += 1;
    }

    // Flush working text before returning the tokens.
    if (this.workingText.length > 0) {
      let text = this.workingText.trim();
      if (text.length > 0) {
        tokens.push({type: 'source', value: text})
      }
      this.workingText = ''
    }

    return tokens;
  }

  pushSourceUntil(regex, input, currentPos, tokens, tokenType = 'source') {
    let nextPos = currentPos;
    let value = ''

    let sourceStarted = false;
    while (nextPos < input.length) {
      if (sourceStarted) {
        if (!regex.test(input[nextPos])) {
          value += input[nextPos];
          nextPos += 1;
        } else {
          break;
        }
      } else {
        if (this.INLINE_WS.test(input[nextPos])) {
          nextPos += 1;
          continue;
        }
        // If a newline is found before the source starts, skip the
        // processing entirely.
        else if (this.NEWLINE_WS.test(input[nextPos])) {
          return currentPos;
        }

        sourceStarted = true;
      }
    }

    if (value.length > 0) {
      this.pushToken(tokens, {type: tokenType, value: value.trim() })
      return nextPos;
    } else {
      return currentPos;
    }
  }


  pushToken(tokens, token) {
    // flush any working tokens.
    let text = this.workingText.trim();
    if (text.length > 0) {
      tokens.push({type: 'source', value: text})
    }
    this.workingText = ''
    tokens.push(token);
  }

  nextCharMatches(char, position, input) {
    return position + 1 < input.length && input[position+1] === char
  }
}