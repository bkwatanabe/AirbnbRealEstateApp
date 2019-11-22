from flask import Flask, render_template, request, send_from_directory
import sys


# Flask app config
app = Flask(__name__)
app.config['JS'] = "js"
app.config['STATIC'] = "static"
app.config['CSS'] = "css"


# Routing for homepage, static files, and the uploader
@app.route('/', methods=["GET"])
def homepage():
    base_url = request.base_url
    return render_template('index.html', base_url = base_url)

@app.route('/js/<path:path>', methods=["GET"])
def get_send_js(path):
    return send_from_directory(app.config['JS'], path)

@app.route('/css/<path:path>', methods=["GET"])
def get_send_css(path):
    return send_from_directory(app.config['CSS'], path)

@app.route('/static/<path:path>', methods=["GET"])
def get_static(path):
    return send_from_directory(app.config['STATIC'], path)


# Stub for running models
# @app.route('/model/<path:path>', methods=["GET"])
# def get_model(path):
#     print(path)
#     return path

if __name__ == '__main__':
    app.run()
