function parsePrimary(code) {
  var scanner = new SemanticsScanner(code, java);
  return scanner.applyRule("primary", "", {}, {}).value;
}

describe("Primary expression", function() {
  it("this -> this", function() {
    expect(parsePrimary("this")).toBe("this");
  });
  
  it("this.x -> (field-access this x)", function() {
    expect(parsePrimary("this.x")).toBe("(field-access this x)");
  });
  
  it("this.x.y -> (field-access (field-access this x) y)", function() {
    expect(parsePrimary("this.x.y")).toBe("(field-access (field-access this x) y)");
  });
  
  it("this.x.m() -> (method-invocation (field-access this x) m)", function() {
    expect(parsePrimary("this.x.m()")).toBe("(method-invocation (field-access this x) m)");
  });
  
  it("x[i][j].y -> (field-access (array-access (array-access x i) j) y)", function() {
    expect(parsePrimary("x[i][j].y")).toBe("(field-access (array-access (array-access x i) j) y)");
  });
  
});
