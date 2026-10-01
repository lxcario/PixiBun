extends SceneTree
# Runs in a real Compatibility viewport; exits nonzero on any assertion.
var checks := 0
var errors: Array[String] = []
var data: Dictionary
var viewport: SubViewport
var node: Node2D
var sample: Node2D
var max_rgb_error := 0
var compared_pixels := 0
var observed_holds: Array = []

func verify(condition: bool, message: String):
    checks += 1
    if not condition:
        errors.append(message)
        push_error(message)

func _initialize():
    call_deferred("run_checks")

func rendered() -> Image:
    await process_frame
    await RenderingServer.frame_post_draw
    return viewport.get_texture().get_image()

func rgb_bytes(color: Color) -> Array:
    return [roundi(color.r * 255), roundi(color.g * 255), roundi(color.b * 255)]

func run_checks():
    data = JSON.parse_string(FileAccess.get_file_as_string("res://manifest.json"))
    var frames: SpriteFrames = load("res://sprite_frames.tres")
    verify(frames != null, "SpriteFrames loads in engine")
    if frames == null:
        quit(1)
        return
    for clip in data.animation.clips:
        verify(frames.has_animation(clip.name), "Named clip " + clip.name)
        if not frames.has_animation(clip.name):
            quit(1)
            return
        verify(frames.get_animation_loop_mode(clip.name) == (1 if clip.loop else 0), "Loop mode " + clip.name)
        verify(frames.get_animation_speed(clip.name) == 1000.0, "Timing scale " + clip.name)
        verify(frames.get_frame_count(clip.name) == clip.frames.size(), "Frame count " + clip.name)
        for i in clip.frames.size():
            var source: int = clip.frames[i]
            var texture: AtlasTexture = frames.get_frame_texture(clip.name, i)
            var rect: Dictionary = data.rects[source]
            verify(texture.region == Rect2(rect.x, rect.y, rect.w, rect.h), "Atlas coordinates " + clip.name)
            verify(texture.filter_clip, "Atlas edge clipping")
            verify(frames.get_frame_duration(clip.name, i) == data.animation.frames[source].durationMs, "Uneven hold " + clip.name)
    sample = load("res://preview.tscn").instantiate()
    root.add_child(sample)
    sample.set_process(false)
    sample.player.stop()
    verify(sample.player.texture_filter == CanvasItem.TEXTURE_FILTER_NEAREST, "Nearest sprite filter")
    verify(sample.player.offset == -Vector2(data.width * data.pivot.x, data.height * data.pivot.y), "Fixed sprite anchor")
    if data.normals:
        for clip in data.animation.clips:
            for i in clip.frames.size():
                var combined: AtlasTexture = sample.player.sprite_frames.get_frame_texture(clip.name, i)
                var pair: CanvasTexture = combined.atlas
                var source_texture: AtlasTexture = frames.get_frame_texture(clip.name, i)
                verify(combined.region == source_texture.region and pair.normal_texture.get_size() == pair.diffuse_texture.get_size(), "Synchronized diffuse / normal coordinates")
                verify(pair.texture_filter == CanvasItem.TEXTURE_FILTER_NEAREST, "Nearest normal pair filter")
    viewport = SubViewport.new()
    viewport.size = Vector2i(data.width, data.height)
    viewport.transparent_bg = true
    viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
    root.add_child(viewport)
    node = Node2D.new()
    viewport.add_child(node)
    sample.remove_child(sample.player)
    node.add_child(sample.player)
    sample.player.position = Vector2.ZERO
    sample.player.offset = Vector2.ZERO
    sample.player.scale = Vector2.ONE
    sample.player.set_frame_and_progress(0, 0.0)
    # Compare original RGBA render with indexed RGBA render at phase zero.
    sample.player.material = null
    var original: Image = await rendered()
    if data.indexed:
        var indices: Image = load("res://indices.png").get_image()
        var alpha: Image = load("res://alpha.png").get_image()
        var diffuse: Image = load("res://atlas.png").get_image()
        var palette_image: Image = load("res://palette.png").get_image()
        var registers: Dictionary = {}
        var entry_ids: Dictionary = {}
        for i in data.palette.entries.size():
            var color := Color.from_string(data.palette.entries[i].color, Color.BLACK)
            var key: String = color.to_html(false)
            if not registers.has(key):
                registers[key] = []
            registers[key].append(i)
            entry_ids[data.palette.entries[i].id] = i
            verify(palette_image.get_pixel(i, 0).to_html(false) == key and palette_image.get_pixel(i, 0).a8 == 255, "Lossless palette register " + str(i))
        for source in data.animation.frames.size():
            var rect: Dictionary = data.rects[source]
            var bad_indices := 0
            var bad_alpha := 0
            var bad_bindings := 0
            for y in int(data.height):
                for x in int(data.width):
                    var xx: int = rect.x + x
                    var yy: int = rect.y + y
                    var color: Color = diffuse.get_pixel(xx, yy)
                    var raw_index: Color = indices.get_pixel(xx, yy)
                    var raw_alpha: Color = alpha.get_pixel(xx, yy)
                    if raw_alpha.r8 != color.a8 or raw_alpha.a8 != 255:
                        bad_alpha += 1
                    if raw_index.a8 != 255 or raw_index.g8 != 0 or raw_index.b8 != 0:
                        bad_indices += 1
                    if color.a8 == 0:
                        continue
                    var matches: Array = registers.get(color.to_html(false), [])
                    var assigned: int = matches[0] if not matches.is_empty() else -1
                    var bound := false
                    for binding in data.palette.bindings:
                        if binding.frameId == data.animation.frames[source].id and x >= binding.x and y >= binding.y and x < binding.x + binding.w and y < binding.y + binding.h:
                            var register: int = entry_ids[binding.entryId]
                            if matches.has(register):
                                assigned = register
                                bound = true
                    if raw_index.r8 != assigned or (matches.size() > 1 and not bound):
                        bad_bindings += 1
            verify(bad_indices == 0, "Raw opaque index data frame " + str(source))
            verify(bad_alpha == 0, "Independent source alpha frame " + str(source))
            verify(bad_bindings == 0, "Register identity and explicit bindings frame " + str(source))
        sample.player.material = sample.palette_material
        sample.palette_material.set_shader_parameter("elapsed_seconds", 0.0)
        var indexed: Image = await rendered()
        verify(original.get_data() == indexed.get_data(), "Indexed shader matches original RGBA render including partial alpha")
        # Every register appears in the opaque left half of each frame.
        var vectors: Array = JSON.parse_string(FileAccess.get_file_as_string("res://vectors.json")) if FileAccess.file_exists("res://vectors.json") else []
        for vector in vectors:
            var shader: Shader = load("res://" + vector.shader)
            sample.palette_material.shader = shader
            for reference in vector.samples:
                sample.palette_material.set_shader_parameter("elapsed_seconds", reference.time)
                for source in data.animation.frames.size():
                    sample.player.set_frame_and_progress(source, 0.0)
                    var image: Image = await rendered()
                    var mismatches := 0
                    for y in 16:
                        for x in 16:
                            var register: int = (y * 16 + x + source) % 256
                            var actual: Array = rgb_bytes(image.get_pixel(x, y))
                            var expected: Array = reference.rgb[register]
                            var error: int = max(abs(actual[0] - int(expected[0])), abs(actual[1] - int(expected[1])), abs(actual[2] - int(expected[2])))
                            max_rgb_error = max(max_rgb_error, error)
                            compared_pixels += 1
                            # GPU float phase can round a BlendShift half-byte differently from JS double.
                            var tolerance := 1 if vector.blendedRegisters[register] else 0
                            if error > tolerance:
                                mismatches += 1
                    verify(mismatches == 0, "GPU / CPU " + vector.shader + " time=" + str(reference.time) + " frame=" + str(source) + " mismatches=" + str(mismatches))
        sample.palette_material.shader = load("res://palette.gdshader")
        sample.palette_material.set_shader_parameter("elapsed_seconds", 0.0)
        sample.player.set_frame_and_progress(0, 0.0)
    if data.normals:
        # Real normal-map lighting: compare right/left light positions against opposite X normals.
        var light := PointLight2D.new()
        var light_image := Image.create(128, 128, false, Image.FORMAT_RGBA8)
        light_image.fill(Color.WHITE)
        light.texture = ImageTexture.create_from_image(light_image)
        light.height = 4.0
        light.energy = 1.0
        node.add_child(light)
        light.position = Vector2(40, 8)
        var right: Image = await rendered()
        light.position = Vector2(-8, 8)
        var left: Image = await rendered()
        verify(right.get_pixel(10, 8).r > left.get_pixel(10, 8).r, "Positive X normal responds to right light")
        verify(right.get_pixel(26, 8).r < left.get_pixel(26, 8).r, "Negative X normal responds to left light")
        sample.player.set_frame_and_progress(1, 0.0)
        light.position = Vector2(16, -8)
        var above: Image = await rendered()
        light.position = Vector2(16, 24)
        var below: Image = await rendered()
        verify(above.get_pixel(10, 8).r > below.get_pixel(10, 8).r, "Positive Y normal responds to upper light")
        verify(above.get_pixel(26, 8).r < below.get_pixel(26, 8).r, "Negative Y normal responds to lower light")
        light.queue_free()
    # Actual AnimatedSprite2D elapsed-time progression follows resource holds.
    sample.player.material = null
    await rendered()
    await process_frame
    sample.play_clip(data.animation.clips[1].name)
    var transitions: Array = []
    sample.player.frame_changed.connect(func():
        if transitions.is_empty() and sample.player.frame == 0:
            return
        transitions.append([sample.player.frame, Time.get_ticks_msec()]))
    var start: int = Time.get_ticks_msec()
    await create_timer(0.48).timeout
    verify(transitions.size() >= 3, "Runtime animation advances all poses")
    if transitions.size() >= 3:
        var clip: Dictionary = data.animation.clips[1]
        var previous := start
        for i in 3:
            var expected_ms: float = data.animation.frames[clip.frames[i]].durationMs
            var actual_ms: int = transitions[i][1] - previous
            observed_holds.append({"expectedMs": expected_ms, "actualMs": actual_ms, "clipPosition": transitions[i][0]})
            verify(abs(actual_ms - expected_ms) <= 40, "Runtime uneven hold=" + str(expected_ms) + " actual=" + str(actual_ms))
            previous = transitions[i][1]
    await rendered()
    viewport.get_texture().get_image().save_png("res://runtime-pixels.png")
    node.remove_child(sample.player)
    sample.add_child(sample.player)
    sample.player.material = sample.palette_material if data.indexed else null
    sample.player.position = Vector2(460, 280)
    sample.player.offset = -Vector2(data.width * data.pivot.x, data.height * data.pivot.y)
    var display_scale: float = min(8.0, 200.0 / max(data.width, data.height))
    sample.player.scale = Vector2.ONE * display_scale
    sample.play_clip(data.animation.clips[0].name)
    sample.player.stop()
    await rendered()
    sample.get_viewport().get_texture().get_image().save_png("res://runtime-comparison.png")
    var report := {"engine": Engine.get_version_info().string, "renderer": RenderingServer.get_current_rendering_method(), "checks": checks, "palettePixelsCompared": compared_pixels, "maxRgbError": max_rgb_error, "discreteTolerance": 0, "blendShiftTolerance": 1, "observedHolds": observed_holds, "holdToleranceMs": 40, "errors": errors}
    var output := FileAccess.open("res://engine-verification.json", FileAccess.WRITE)
    output.store_string(JSON.stringify(report, "  "))
    print(JSON.stringify(report))
    quit(0 if errors.is_empty() else 1)
