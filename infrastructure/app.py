#!/usr/bin/env python3
import aws_cdk as cdk
from my_resume_stack.my_resume_stack import ResumeStack

app = cdk.App()
ResumeStack(app, "ResumeStack")
app.synth()
# trigger CDK deploy
