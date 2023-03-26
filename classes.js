const { setTimeout } = require("timers/promises");

/**
 * Objects that manage and process tunnel connection information
 */
class TunnelObject{
  #server;
  #client;
  #reconnect;
  #connecting;
  /**
   * Error messages that need to be reconnected
   */
  RECONNECT_MESSAGES = ["No response from server", "Unable to exec", "Not connected"];
  /**
   * 
   * @param {net.Server} serverSocket Server object.
   * @param {ssh2.Client} clientSocket Client object.
   * @param {Boolean} reconnect `Shutdown()` If the client is disconnected before calling, specify true when connecting automatically.
   */
  constructor(serverSocket, clientSocket, reconnect){
    this.#server = serverSocket;
    this.#client = clientSocket;
    this.#reconnect = reconnect;
    this.#connecting = false;
  }

  /**
   * Get the server of the server of the connected.
   */
  get server() { return this.#server; }
  /**
   * Get the client connection object being connected.
   */
  get client() { return this.#client; }
  
  /**
   * Start transfer processing.
   * @param {ForwardOptions} forwardOptions Transfer options
   * @param {ssh2.Client} connection SSH Connection
   */
  async forwardOut(forwardOptions, connection){
    this.#connecting = true;
    try {
      this.client.forwardOut(
        forwardOptions.srcAddr,
        forwardOptions.srcPort,
        forwardOptions.dstAddr,
        forwardOptions.dstPort, (err, stream) => {
            connection.pipe(stream).pipe(connection);
        });
    } catch (error) {
      if(this.#connecting && this.#reconnect && this.RECONNECT_MESSAGES.includes(error.message)){
        this.server.close();
        this.client.end();
        await setTimeout(100);
        this.forwardOut(forwardOptions, connection);
      }
    }
  }

  /**
   * Close the connection.
   */
  close(){
    this.#connecting = false;
    this.#server.close();
    this.#client.end();
  }
}

module.exports = { TunnelObject }