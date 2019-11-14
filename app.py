from flask import Flask, render_template, request, send_from_directory


# Flask app config
app = Flask(__name__)
app.config['JS'] = "js"
app.config['STATIC'] = "static"
app.config['CSS'] = "css"


# Routing for homepage, static files, and the uploader
@app.route('/', methods=["GET"])
def homepage():
    return render_template('index.html')


@app.route('/js/<path:path>', methods=["GET"])
def get_send_js(path):
    return send_from_directory(app.config['JS'], path)

@app.route('/css/<path:path>', methods=["GET"])
def get_send_css(path):
    return send_from_directory(app.config['CSS'], path)

@app.route('/favicon.ico', methods=["GET"])
def get_favicon():
    return send_from_directory(app.config['STATIC'], "favicon.ico")

@app.route('/nyc.json', methods=["GET"])
def get_nyc():
    return send_from_directory(app.config['STATIC'], "nyc.json")


# Endpoint for uploading files
# Accepts files if it has an allowed extension
# Else raises an error
@app.route('/model/<path:path>', methods=["GET"])
def get_model(path):
    print(path)
    return path


if __name__ == '__main__':
    app.run()
