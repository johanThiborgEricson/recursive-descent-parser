function SemanticsScanner(code, language) {
  this.code = code;
  this.position = 0;
  this.language = language;
  this.undoHistory = [];
  this.memo = {};
  this.isOnStack = {};
}

SemanticsScanner.prototype = {
  constructor: SemanticsScanner,
  applyRule: function(ruleName, currentLR, alreadyEvaluated) {
    var group = this.groupStart();
    var id = this.position + ruleName;
    var memoRec = this.memo[id];
    if(this.position === this.HAS_FAILED) {
      result = this.failedResult();
      if(memoRec) {
        result.reportedLeftRecursions = memoRec.isInvolvedInLeftRecursionOf;
      }
    } else if(!memoRec) {
      if(this.isOnStack[id]) {
        result = this.failedResult();
      } else {
        memoRec = {
          isInvolvedInLeftRecursionOf: {},
        };
        result = this.applyRuleAndLeftRecurse(memoRec, ruleName, currentLR, alreadyEvaluated, id);
      }
    } else {
      if(this.isOnStack[id]) {
        result = this.retrieveResult(memoRec);
      } else if(this.needsReevaluation(memoRec, currentLR, alreadyEvaluated, id)) {
        result = this.reapplyRule(memoRec, ruleName, currentLR, alreadyEvaluated, id);
      } else {
        result = this.retrieveResult(memoRec);
      }
    }
    
    if(this.isOnStack[id]){
      result.reportedLeftRecursions[id] = true;
    }
    
    group.end();
    return result;
  },
  
  applyRuleAndLeftRecurse: function(memoRec, ruleName, currentLR, alreadyEvaluated, id) {
    var result = {
      reportedLeftRecursions: {},
    };
    var backtrackPosition = this.position;
    var leftRecursionDetected = this.reallyApplyRule(ruleName, currentLR, alreadyEvaluated, memoRec, id, result);
    this.memo[id] = memoRec;
    if(leftRecursionDetected && !this.hasFailed()){
      this.growLR(memoRec, ruleName, id, backtrackPosition, result);
    }
    return result;
  },
  
  growLR: function(memoRec, ruleName, id, backtrackPosition, result) {
    var currentLR = id;
    var isGrowing = true;
    while(isGrowing){
      var alreadyEvaluated = {};
      this.position = backtrackPosition;
      var oldMe = Object.assign({}, memoRec);
      this.reallyApplyRule(ruleName, currentLR, {}, memoRec, id, result);
      var longestMe = this.regretIfShorter(memoRec, oldMe, result);
      isGrowing = (longestMe === memoRec);
    }
  },
  
  reallyApplyRule: function(ruleName, currentLR, alreadyEvaluated, memoRec, id, result) {
    this.isOnStack[id] = true;
    this.language[ruleName](this, currentLR, alreadyEvaluated, result);
    delete this.isOnStack[id];
    memoRec.value = result.value;
    memoRec.position = this.position;
    var leftRecursionDetected = result.reportedLeftRecursions[id];
    // An applicantion of a rule is not involved in its own LR, by definition.
    delete result.reportedLeftRecursions[id];
    Object.assign(memoRec.isInvolvedInLeftRecursionOf, result.reportedLeftRecursions);
    return leftRecursionDetected;
  },
  
  regretIfShorter: function(memoRec, oldMe, result) {
    var longestMe;
    if(this.hasFailed() || this.position <= oldMe.position) {
      memoRec.value = oldMe.value;
      memoRec.position = oldMe.position;
      this.position = oldMe.position;
      longestMe = oldMe;
    } else {
      longestMe = memoRec;
    }
    result.value = longestMe.value;
    return longestMe;
  },
  
  needsReevaluation: function(memoRec, currentLR, alreadyEvaluated, id) {
    return memoRec.isInvolvedInLeftRecursionOf[currentLR] && !alreadyEvaluated[id];
  },
  
  reapplyRule: function(memoRec, ruleName, currentLR, alreadyEvaluated, id) {
    var oldMe = Object.assign({}, memoRec);
    result = this.applyRuleAndLeftRecurse(memoRec, ruleName, currentLR, alreadyEvaluated, id);
    this.regretIfShorter(memoRec, oldMe, result);
    alreadyEvaluated[id] = true;
    return result;
  },
  
  retrieveResult: function(memoRec) {
    this.position = memoRec.position;
    var result = {
      reportedLeftRecursions: Object.assign({}, memoRec.isInvolvedInLeftRecursionOf),
      value: memoRec.value,
    };
    return result;
  },
  
  failedResult: function() {
    this.position = this.HAS_FAILED;
    return {
      value: null,
      reportedLeftRecursions: {},
    };
  },
  
  scan: function(pattern) {
    var result = null;
    this.undoHistory.push(this.position);
    if(this.position === this.HAS_FAILED){
      result = null;
    } else if(pattern instanceof RegExp) {
      pattern.lastIndex = this.position;
      result = pattern.exec(this.code);
      result = result && result[0];
    } else if(pattern === this.code.substring(
          this.position, this.position+pattern.length)){
      result = pattern;
    }
    this.position = (result === null)? this.HAS_FAILED : this.position+result.length;
    return result;
  },
  
  groupStart: function() {
    var scanner = this;
    var outerUndoHistory = this.undoHistory;
    outerUndoHistory.push(this.position);
    this.undoHistory = [];
    return {
      end: function() {
        scanner.undoHistory = outerUndoHistory;
      },
      
    };
    
  },
  
  hasFailed: function() {
    return this.position === this.HAS_FAILED;
  },
  
  HAS_FAILED: -1,
  
  undo: function(times) {
    if(arguments.length === 0){
      times = 1;
    }
    while(times-- > 0){
      this.position = this.undoHistory.pop();
    }
  }
  
};
