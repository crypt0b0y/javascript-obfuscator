import { ServiceIdentifiers } from '../../../../src/container/ServiceIdentifiers';

import * as estraverse from 'estraverse';
import * as ESTree from 'estree';

import { assert } from 'chai';

import { TNodeWithBlockStatement } from '../../../../src/types/node/TNodeWithBlockStatement';

import { IInversifyContainerFacade } from '../../../../src/interfaces/container/IInversifyContainerFacade';
import { IStackTraceAnalyzer } from '../../../../src/interfaces/stack-trace-analyzer/IStackTraceAnalyzer';
import { IStackTraceData } from '../../../../src/interfaces/stack-trace-analyzer/IStackTraceData';

import { readFileAsString } from '../../../helpers/readFileAsString';

import { InversifyContainerFacade } from '../../../../src/container/InversifyContainerFacade';
import { Node } from '../../../../src/node/Node';
import { Nodes } from '../../../../src/node/Nodes';
import { NodeUtils } from '../../../../src/node/NodeUtils';

/**
 * @param astTree
 * @param name
 * @returns {ESTree.FunctionDeclaration|null}
 */
function getFunctionDeclarationByName (astTree: ESTree.Node, name: string): ESTree.FunctionDeclaration|null {
    let functionDeclarationNode: ESTree.FunctionDeclaration|null = null;

    estraverse.traverse(astTree, {
        enter: (node: ESTree.Node): any => {
            if (
                Node.isFunctionDeclarationNode(node) &&
                Node.isIdentifierNode(node.id) &&
                node.id.name === name
            ) {
                functionDeclarationNode = node;

                return estraverse.VisitorOption.Break;
            }
        }
    });

    return functionDeclarationNode;
}

/**
 * @param astTree
 * @param name
 * @returns {ESTree.FunctionExpression|null}
 */
function getFunctionExpressionByName (astTree: ESTree.Node, name: string): ESTree.FunctionExpression|null {
    let functionExpressionNode: ESTree.FunctionExpression|null = null;

    estraverse.traverse(astTree, {
        enter: (node: ESTree.Node): any => {
            if (
                Node.isVariableDeclaratorNode(node) &&
                node.init &&
                Node.isFunctionExpressionNode(node.init) &&
                Node.isIdentifierNode(node.id) &&
                node.id.name === name
            ) {
                functionExpressionNode = node.init;

                return estraverse.VisitorOption.Break;
            }
        }
    });

    return functionExpressionNode;
}

/**
 * @param astTree
 * @param id
 * @returns {ESTree.FunctionExpression|null}
 */
function getFunctionExpressionById (astTree: ESTree.Node, id: string): ESTree.FunctionExpression|null {
    let functionExpressionNode: ESTree.FunctionExpression|null = null;

    estraverse.traverse(astTree, {
        enter: (node: ESTree.Node): any => {
            if (
                Node.isFunctionExpressionNode(node) &&
                node.id &&
                Node.isIdentifierNode(node.id) &&
                node.id.name === id
            ) {
                functionExpressionNode = node;

                return estraverse.VisitorOption.Break;
            }
        }
    });

    return functionExpressionNode;
}

/**
 * @param astTree
 * @param objectName
 * @param name
 * @returns {ESTree.FunctionExpression|null}
 */
function getObjectFunctionExpressionByName (astTree: ESTree.Node, objectName: string, name: string|number): ESTree.FunctionExpression|null {
    let functionExpressionNode: ESTree.FunctionExpression|null = null,
        targetObjectExpressionNode: ESTree.ObjectExpression|null = null;

    estraverse.traverse(astTree, {
        enter: (node: ESTree.Node): any => {
            if (
                Node.isVariableDeclaratorNode(node) &&
                Node.isIdentifierNode(node.id) &&
                node.init &&
                Node.isObjectExpressionNode(node.init) &&
                node.id.name === objectName
            ) {
                targetObjectExpressionNode = node.init;

                return estraverse.VisitorOption.Break;
            }
        }
    });

    if (!targetObjectExpressionNode) {
        return null;
    }

    estraverse.traverse(targetObjectExpressionNode, {
        enter: (node: ESTree.Node): any => {
            if (
                Node.isPropertyNode(node) &&
                Node.isFunctionExpressionNode(node.value) &&
                (
                    (Node.isIdentifierNode(node.key) && node.key.name === name) ||
                    (Node.isLiteralNode(node.key) && node.key.value === name)
                )
            ) {
                functionExpressionNode = node.value;

                return estraverse.VisitorOption.Break;
            }
        }
    });

    return functionExpressionNode;
}

describe('StackTraceAnalyzer', () => {
    describe('extract (): IStackTraceData[]', () => {
        const inversifyContainerFacade: IInversifyContainerFacade = new InversifyContainerFacade({});
        const stackTraceAnalyzer: IStackTraceAnalyzer = inversifyContainerFacade
            .get<IStackTraceAnalyzer>(ServiceIdentifiers.IStackTraceAnalyzer);

        let expectedStackTraceData: IStackTraceData[],
            stackTraceData: IStackTraceData[];

        describe('variant #1: basic-1', () => {
            before(() => {
                const code: string = readFileAsString(__dirname + '/fixtures/basic-1.js');
                const astTree: TNodeWithBlockStatement = Nodes.getProgramNode(
                    NodeUtils.convertCodeToStructure(code)
                );

                expectedStackTraceData = [
                    {
                        name: 'baz',
                        callee: (<ESTree.FunctionDeclaration>getFunctionDeclarationByName(astTree, 'baz')).body,
                        stackTrace: []
                    },
                    {
                        name: 'foo',
                        callee: (<ESTree.FunctionDeclaration>getFunctionDeclarationByName(astTree, 'foo')).body,
                        stackTrace: []
                    },
                    {
                        name: 'bar',
                        callee: (<ESTree.FunctionDeclaration>getFunctionDeclarationByName(astTree, 'bar')).body,
                        stackTrace: [
                            {
                                name: 'inner2',
                                callee: (<ESTree.FunctionDeclaration>getFunctionDeclarationByName(astTree, 'inner2')).body,
                                stackTrace: [
                                    {
                                        name: 'inner3',
                                        callee: (<ESTree.FunctionExpression>getFunctionExpressionByName(astTree, 'inner3')).body,
                                        stackTrace: []
                                    },
                                ]
                            },
                            {
                                name: 'inner1',
                                callee: (<ESTree.FunctionDeclaration>getFunctionDeclarationByName(astTree, 'inner1')).body,
                                stackTrace: []
                            },
                        ]
                    }
                ];

                stackTraceData = stackTraceAnalyzer.analyze(astTree.body);
            });

            it('should return correct stack trace data', () => {
                assert.deepEqual(stackTraceData, expectedStackTraceData);
            });
        });

        describe('variant #2: basic-2', () => {
            before(() => {
                const code: string = readFileAsString(__dirname + '/fixtures/basic-2.js');
                const astTree: TNodeWithBlockStatement = Nodes.getProgramNode(
                    NodeUtils.convertCodeToStructure(code)
                );

                expectedStackTraceData = [
                    {
                        name: 'bar',
                        callee: (<ESTree.FunctionDeclaration>getFunctionDeclarationByName(astTree, 'bar')).body,
                        stackTrace: []
                    },
                    {
                        name: 'baz',
                        callee: (<ESTree.FunctionDeclaration>getFunctionDeclarationByName(astTree, 'baz')).body,
                        stackTrace: [
                            {
                                name: 'inner1',
                                callee: (<ESTree.FunctionDeclaration>getFunctionDeclarationByName(astTree, 'inner1')).body,
                                stackTrace: []
                            },
                        ]
                    },
                    {
                        name: 'foo',
                        callee: (<ESTree.FunctionDeclaration>getFunctionDeclarationByName(astTree, 'foo')).body,
                        stackTrace: []
                    }
                ];

                stackTraceData = stackTraceAnalyzer.analyze(astTree.body);
            });

            it('should return correct stack trace data', () => {
                assert.deepEqual(stackTraceData, expectedStackTraceData);
            });
        });

        describe('variant #3: deep conditions nesting', () => {
            before(() => {
                const code: string = readFileAsString(__dirname + '/fixtures/deep-conditions-nesting.js');
                const astTree: TNodeWithBlockStatement = Nodes.getProgramNode(
                    NodeUtils.convertCodeToStructure(code)
                );

                expectedStackTraceData = [
                    {
                        name: 'bar',
                        callee: (<ESTree.FunctionDeclaration>getFunctionDeclarationByName(astTree, 'bar')).body,
                        stackTrace: []
                    },
                    {
                        name: 'baz',
                        callee: (<ESTree.FunctionDeclaration>getFunctionDeclarationByName(astTree, 'baz')).body,
                        stackTrace: [
                            {
                                name: 'inner1',
                                callee: (<ESTree.FunctionDeclaration>getFunctionDeclarationByName(astTree, 'inner1')).body,
                                stackTrace: []
                            },
                        ]
                    },
                    {
                        name: 'foo',
                        callee: (<ESTree.FunctionDeclaration>getFunctionDeclarationByName(astTree, 'foo')).body,
                        stackTrace: []
                    }
                ];

                stackTraceData = stackTraceAnalyzer.analyze(astTree.body);
            });

            it('should return correct stack trace data', () => {
                assert.deepEqual(stackTraceData, expectedStackTraceData);
            });
        });

        describe('variant #4: call before declaration', () => {
            before(() => {
                const code: string = readFileAsString(__dirname + '/fixtures/call-before-declaration.js');
                const astTree: TNodeWithBlockStatement = Nodes.getProgramNode(
                    NodeUtils.convertCodeToStructure(code)
                );

                expectedStackTraceData = [
                    {
                        name: 'bar',
                        callee: (<ESTree.FunctionDeclaration>getFunctionDeclarationByName(astTree, 'bar')).body,
                        stackTrace: []
                    }
                ];

                stackTraceData = stackTraceAnalyzer.analyze(astTree.body);
            });

            it('should return correct stack trace data', () => {
                assert.deepEqual(stackTraceData, expectedStackTraceData);
            });
        });

        describe('variant #5: call expression of object member #1', () => {
            before(() => {
                const code: string = readFileAsString(__dirname + '/fixtures/call-expression-of-object-member-1.js');
                const astTree: TNodeWithBlockStatement = Nodes.getProgramNode(
                    NodeUtils.convertCodeToStructure(code)
                );

                expectedStackTraceData = [
                    {
                        name: 'baz',
                        callee: (<ESTree.FunctionExpression>getObjectFunctionExpressionByName(astTree, 'object1', 'baz')).body,
                        stackTrace: []
                    },
                    {
                        name: 'baz',
                        callee: (<ESTree.FunctionExpression>getObjectFunctionExpressionByName(astTree, 'object1', 'baz')).body,
                        stackTrace: []
                    },
                    {
                        name: 'func',
                        callee: (<ESTree.FunctionExpression>getObjectFunctionExpressionByName(astTree, 'object1', 'func')).body,
                        stackTrace: []
                    },
                    {
                        name: 'bar',
                        callee: (<ESTree.FunctionExpression>getObjectFunctionExpressionByName(astTree, 'object1', 'bar')).body,
                        stackTrace: [
                            {
                                name: 'inner1',
                                callee: (<ESTree.FunctionDeclaration>getFunctionDeclarationByName(astTree, 'inner1')).body,
                                stackTrace: [

                                ]
                            },
                        ]
                    },
                    {
                        name: 'bar',
                        callee: (<ESTree.FunctionExpression>getObjectFunctionExpressionByName(astTree, 'object', 'bar')).body,
                        stackTrace: [
                            {
                                name: 'inner',
                                callee: (<ESTree.FunctionDeclaration>getFunctionDeclarationByName(astTree, 'inner')).body,
                                stackTrace: [

                                ]
                            },
                        ]
                    }
                ];

                stackTraceData = stackTraceAnalyzer.analyze(astTree.body);
            });

            it('should return correct stack trace data', () => {
                assert.deepEqual(stackTraceData, expectedStackTraceData);
            });
        });

        describe('variant #5: call expression of object member #2', () => {
            before(() => {
                const code: string = readFileAsString(__dirname + '/fixtures/call-expression-of-object-member-2.js');
                const astTree: TNodeWithBlockStatement = Nodes.getProgramNode(
                    NodeUtils.convertCodeToStructure(code)
                );

                expectedStackTraceData = [
                    {
                        name: 'baz',
                        callee: (<ESTree.FunctionExpression>getObjectFunctionExpressionByName(astTree, 'object', 'baz')).body,
                        stackTrace: []
                    },
                    {
                        name: 1,
                        callee: (<ESTree.FunctionExpression>getObjectFunctionExpressionByName(astTree, 'object1', 1)).body,
                        stackTrace: []
                    },
                ];

                stackTraceData = stackTraceAnalyzer.analyze(astTree.body);
            });

            it('should return correct stack trace data', () => {
                assert.deepEqual(stackTraceData, expectedStackTraceData);
            });
        });

        describe('variant #6: no call expressions', () => {
            before(() => {
                const code: string = readFileAsString(__dirname + '/fixtures/no-call-expressions.js');
                const astTree: TNodeWithBlockStatement = Nodes.getProgramNode(
                    NodeUtils.convertCodeToStructure(code)
                );

                expectedStackTraceData = [];

                stackTraceData = stackTraceAnalyzer.analyze(astTree.body);
            });

            it('should return correct stack trace data', () => {
                assert.deepEqual(stackTraceData, expectedStackTraceData);
            });
        });

        describe('variant #7: only call expression', () => {
            before(() => {
                const code: string = readFileAsString(__dirname + '/fixtures/only-call-expression.js');
                const astTree: TNodeWithBlockStatement = Nodes.getProgramNode(
                    NodeUtils.convertCodeToStructure(code)
                );

                expectedStackTraceData = [];

                stackTraceData = stackTraceAnalyzer.analyze(astTree.body);
            });

            it('should return correct stack trace data', () => {
                assert.deepEqual(stackTraceData, expectedStackTraceData);
            });
        });

        describe('variant #8: self-invoking functions', () => {
            before(() => {
                const code: string = readFileAsString(__dirname + '/fixtures/self-invoking-functions.js');
                const astTree: TNodeWithBlockStatement = Nodes.getProgramNode(
                    NodeUtils.convertCodeToStructure(code)
                );

                expectedStackTraceData = [
                    {
                        name: null,
                        callee: (<ESTree.FunctionExpression>getFunctionExpressionById(astTree, 'foo')).body,
                        stackTrace: [{
                            name: null,
                            callee: (<ESTree.FunctionExpression>getFunctionExpressionById(astTree, 'bar')).body,
                            stackTrace: [{
                                name: null,
                                callee: (<ESTree.FunctionExpression>getFunctionExpressionById(astTree, 'baz')).body,
                                stackTrace: [{
                                    name: 'inner',
                                    callee: (<ESTree.FunctionDeclaration>getFunctionDeclarationByName(astTree, 'inner')).body,
                                    stackTrace: []
                                }]
                            }]
                        }]
                    }
                ];

                stackTraceData = stackTraceAnalyzer.analyze(astTree.body);
            });

            it('should return correct stack trace data', () => {
                assert.deepEqual(stackTraceData, expectedStackTraceData);
            });
        });

        describe('variant #9: no recursion', () => {
            before(() => {
                const code: string = readFileAsString(__dirname + '/fixtures/no-recursion.js');
                const astTree: TNodeWithBlockStatement = Nodes.getProgramNode(
                    NodeUtils.convertCodeToStructure(code)
                );

                expectedStackTraceData = [
                    {
                        name: 'bar',
                        callee: (<ESTree.FunctionExpression>getFunctionExpressionByName(astTree, 'bar')).body,
                        stackTrace: []
                    }
                ];

                stackTraceData = stackTraceAnalyzer.analyze(astTree.body);
            });

            it('should return correct stack trace data', () => {
                assert.deepEqual(stackTraceData, expectedStackTraceData);
            });
        });
    });
});
