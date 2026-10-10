export default class Parser {

  workingText = ''
  beginningOfLine = true

  INLINE_WS=/[ \t]/;
  NEWLINE_WS=/[\r\n]/;
  SHORTHAND_CHARS = /[A-Za-z-_.# ]/


  tokenize(input) {
    if (typeof input != "string") {
      console.log("Parse error: non-string input")
      throw "ERROR: non-string input (Parser.tokenize)"
    }

    let currentPos = 0;
    let tokens = [];


    while (currentPos < input.length) {
      let char = input[currentPos];

      // skip until the first non-space, non-tab character in a line.
      if (this.beginningOfLine) {
        while (currentPos < input.length && this.INLINE_WS.test(input[currentPos])) {

          currentPos += 1;
        }

        this.beginningOfLine = false;
        continue;
      }

      // newline handling
      if (this.NEWLINE_WS.test(char)) {
        this.pushToken(tokens, {type: 'newline', value: '\n'});
        this.beginningOfLine = true;

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
      tokens.push({type: 'source', value: this.workingText})
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
      this.pushToken(tokens, {type: tokenType, value: value})
      return nextPos;
    } else {
      return currentPos;
    }
  }


  pushToken(tokens, token) {
    // flush any working tokens.
    if (this.workingText.length > 0) {
      tokens.push({type: 'source', value: this.workingText})
      this.workingText = ''
    }

    tokens.push(token);
  }

  nextCharMatches(char, position, input) {
    return position + 1 < input.length && input[position+1] === char
  }
}