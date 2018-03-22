var misc = {
  dumbTerminal: function(pattern) {
    return function(scanner, currentLR, alreadyEvaluated, result) {
      result.value = scanner.scan(pattern);
    };
    
  },
  
  or: function() {
    var alternatives = arguments;
    return function(scanner, currentLR, alreadyEvaluated, result) {
      var i = 0;
      var childResult = scanner.applyRule(alternatives[i], currentLR, alreadyEvaluated);
      Object.assign(result.reportedLeftRecursions, childResult.reportedLeftRecursions);
      i++;
      while(scanner.hasFailed() && i < alternatives.length){
        scanner.undo();
        childResult = scanner.applyRule(alternatives[i], currentLR, alreadyEvaluated);
        Object.assign(result.reportedLeftRecursions, childResult.reportedLeftRecursions);
        i++;
      }
      result.value = childResult.value;
    };
    
  },
  
  sAlt: function() {
    var alternatives = Array.prototype.slice.call(arguments);
    var name = alternatives.pop();
    return function(scanner, currentLR, alreadyEvaluated, result) {
      misc.sAlternative(scanner, currentLR, alreadyEvaluated, result, name, alternatives);
    };

  },
  
  sAlternative: function(scanner, currentLR, alreadyEvaluated, result, name, alternatives) {
    var i = 0;
    this.sGroup(scanner, currentLR, alreadyEvaluated, result, name, alternatives[i++]);
    while(scanner.hasFailed() && i < alternatives.length){
      scanner.undo();
      this.sGroup(scanner, currentLR, alreadyEvaluated, result, name, alternatives[i++]);
    }
  },
  
  sGroup: function(scanner, currentLR, alreadyEvaluated, result, name, children) {
    var values = [name],
        match,
        i = 0;
    var group = scanner.groupStart();
      while(i < children.length) {
        if(scanner.language[children[i]]) {
          match = scanner.applyRule(children[i++], currentLR, alreadyEvaluated);
          values.push(match.value);
          Object.assign(result.reportedLeftRecursions, match.reportedLeftRecursions);
        } else {
          scanner.scan(children[i++]);
        }
      }
    group.end();
    result.value = "(" + values.join(" ") + ")";
  },
  
};