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
            currentPos = this.pushNextWord(input, currentPos, tokens)
            continue;
          }
          // Check for frostlining conditional statement: '<? [JS_expr] ? [text] (| [text] ?>)'
          else if (nextChar === '?') {
            let conditionalEndPos = currentPos + 1;
            let conditional = ''
            while (conditionalEndPos < input.length && input[conditionalEndPos] !== '?') {
              conditional += input[conditionalEndPos]

              conditionalEndPos += 1;
            }
            if (conditionalEndPos < input.length && input[conditionalEndPos] === '?') {
              this.pushToken(tokens, {type: 'fl-conditional-start', value: `${conditional}`});
              currentPos = conditionalEndPos + 1;
              currentPos = this.pushNextWord(input, currentPos, tokens)
              continue;
            }
          } else if (this.SHORTHAND_CHARS.test(nextChar)) {
            // Check for HTML shorthand markup: '<[fl-styling-names]: [text] (:>)'
            let stylingNamePos = currentPos + 1;
            let stylingNames = nextChar;
            while (stylingNamePos < input.length && this.SHORTHAND_CHARS.test(input[stylingNamePos])) {
              stylingNames += input[stylingNamePos];
              stylingNamePos += 1;
            }
            if (input[stylingNamePos] === ':') {
              this.pushToken(tokens, {type: 'fl-styling-start', value: `${stylingNames}`})
              currentPos = stylingNamePos + 1;
              currentPos = this.pushNextWord(input, currentPos, tokens)
              continue;
            }
          }

          // Check for frostlining glue: '<>'
          else if (nextChar === '>') {
            this.pushToken(tokens, {type: 'fl-glue', value: '<>'});
            currentPos += 2;
            currentPos = this.pushNextWord(input, currentPos, tokens)
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
      else if (char === '?' && this.nextCharMatches('>', currentPos, input)) {
        this.pushToken(tokens, {type: 'fl-conditional-end', value: '?>'})
        currentPos += 2;
        continue;
      }
      // Check for frostlining html-shorthand ending:  ':>'
      else if (char === ':' && this.nextCharMatches('>', currentPos, input)) {
        this.pushToken(tokens, {type: 'fl-styling-end', value: ':>'})
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

  // Run through existing whitespace, then push the next string of
  // non-whitespace characters as a 'word'. This will (slightly)
  // simplify processing later on (hopefully).
  pushNextWord(input, currentPos, tokens) {
    let nextPos = currentPos;
    let value = ''

    let wordStarted = false;
    while (nextPos < input.length) {

      if (wordStarted) {
        if (!/\s/.test(input[nextPos])) {
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
        // If a newline is found before the word starts, skip the
        // processing entirely.
        else if (this.NEWLINE_WS.test(input[nextPos])) {
          return currentPos;
        }

        wordStarted = true;
      }
    }

    if (value.length > 0) {
      this.pushToken(tokens, {type: 'word', value: value})
    }

    return nextPos;
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