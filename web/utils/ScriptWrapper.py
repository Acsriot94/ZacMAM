#!/usr/bin/env python

import sys
import inspect
import importlib
import os
import ast
import imp
from os.path import dirname

if __name__ == "__main__":

    # get the second argument from the command line
    methodname = sys.argv[2]

    # split this into module, class and function name
    modulename, classname, funcname = methodname.split(".")

    print(sys.argv[1]);
    print(modulename);
    print(classname);
    print(funcname);
    print(dirname(sys.argv[1]));

    sys.path.append(os.path.abspath(dirname(sys.argv[1])))
    themodule = importlib.import_module(modulename,sys.argv[1])

    # get pointers to the objects based on the string names
    theclass = getattr(themodule, classname)
    thefunc = getattr(theclass, funcname)

    # pass all the parameters from the third until the end of 
    # what the function needs & ignore the rest
    args = inspect.getargspec(thefunc)
    z = len(args[0]) + 3

    print(args)
    print(z)

    params=sys.argv[3:z]

    print(params)
    print(len(params))

    for i in range(0,len(params)):
        params[i] = sys.argv[3+i]
        print(params[i])
        params[i] = ast.literal_eval(params[i])



try:
#	thefunc(param_dict)
    thefunc(*params)

except AttributeError:
	print("Scripting error: method doesn't exist")