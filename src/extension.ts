// Copyright (c) 2016-2017 Vittorio Romeo
// License: Academic Free License ("AFL") v. 3.0
// AFL License page: http://opensource.org/licenses/AFL-3.0
// https://vittorioromeo.info | vittorio.romeo@outlook.com

import * as vscode from 'vscode';

// Bracket tables
const symbols_l = ['{', '[', '('];
const symbols_r = ['}', ']', ')'];
// Return the top of the stack
const peek = (stack: any[]) => stack.slice(-1)[0];

// Show unbalanced brackets error
const show_error_popup = () => vscode.window.showInformationMessage('Unbalanced brackets :(');

// Behavior for `search_scope` towards left
const left = 
{
    predicate: (i: number, _: any) => i >= 0,
    step: -1,
    my_symbols: symbols_l,
    other_symbols: symbols_r
};

// Behavior for `search_scope` towards right
const right = 
{
    predicate: (i: number, text: string | any[]) => i < text.length, // 可以继续往下走
    step: 1,
    my_symbols: symbols_r,
    other_symbols: symbols_l
};

function search_scope(text: string, offset: number, direction: any, then: any)
{
    // Stack of other brackets
    let stack: number[] = [];

    // Look for bracket towards direction
    for (let i = offset; direction.predicate(i, text); i += direction.step) 
    {
        // Current character
        const c = text[i];
        
        let matching_other = direction.other_symbols.indexOf(c);
        if(matching_other !== -1) 
        {
            // Found bracket of "other" kind while looking for "my" bracket
            stack.push(matching_other);
            continue;
        }
        
        let matching_my = direction.my_symbols.indexOf(c);
        if (matching_my === -1) 
        {
            continue;
        }
        else if(stack.length > 0)
        {
            // Found "my" bracket
            if(peek(stack) === matching_my)
            {
                // Bracket of "my" kind matches top of stack
                stack.pop();
                continue;
            }
            else
            {
                // Failure
                show_error_popup();
                return;
            }
        }
        else
        {
            then(i, matching_my);
            return;
        }
    }
}

export function activate(context: vscode.ExtensionContext) 
{
    const cmd_name = 'expand-selection-to-scope.expand';
    
    let disposable = vscode.commands.registerTextEditorCommand(cmd_name, (editor) => 
    {
        let document = editor.document;
        editor.selections = editor.selections.map((selection: any, selectionIdx: any) => 
        {
            const text = document.getText();

            let offset_l = document.offsetAt(selection.start);
            let offset_r = document.offsetAt(selection.end) - 1;

            // Try expanding selection to outer scope
            if(offset_l > 0 && offset_r < text.length - 1)
            {
                // Try to get surrounding brackets
                const s_l = symbols_l.indexOf(text[offset_l - 1]);
                const s_r = symbols_r.indexOf(text[offset_r + 1]);

                // Verify that both are brackets and match
                const both_brackets = s_l !== -1 && s_r !== -1;
                const equal = s_l === s_r;

                if(both_brackets && equal)
                {
                    // Expand selection
                    return new vscode.Selection(
                        document.positionAt(offset_l - 1), document.positionAt(offset_r + 2));
                }
            }

            // Search matching scopes, first to the left, then to the right
            search_scope(text, offset_l - 1, left, (il: number, match_l: any) => 
            {
                search_scope(text, offset_r + 1, right, (ir: number, match_r: any) => 
                {
                    if(match_l !== match_r)
                    {
                        show_error_popup();
                        return selection;
                    }

                    // Select everything inside the scope
                    let l_pos = document.positionAt(il + 1);
                    let r_pos = document.positionAt(ir);
                    selection = new vscode.Selection(l_pos, r_pos);
                });
            });

            return selection;
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() { }